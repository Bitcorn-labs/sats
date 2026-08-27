import { useCallback, useMemo, useState } from 'react';
import { Principal } from '@icp-sdk/core/principal';
import { SATSCanisterID } from '../config';
import { describeError } from '../lib/errors';
import {
  formatRaw,
  isAmountInput,
  parseAmount,
  toDecimalString,
} from '../lib/format';
import {
  maxPayable,
  quote,
  type Fees,
  type Mode,
  type Quote,
} from '../lib/swap';
import type { Balances } from './useLedgerData';
import type { Session } from './useAuth';

const DEFAULT_AMOUNT: Record<Mode, string> = {
  wrap: '0.00100000',
  unwrap: '100000.00000000',
};

export type SwapStatus = 'idle' | 'pending' | 'success' | 'error';

export interface Step {
  label: string;
  done: boolean;
}

export interface Success {
  kind: 'success';
  receiveRaw: bigint;
  caption: string;
  ckbtcBlock: bigint;
  satsBlock: bigint;
}

export interface Failure {
  kind: 'error';
  title: string;
  body: string;
  code: string;
  reason: string;
}

export type Outcome = Success | Failure;

export interface Swap {
  mode: Mode;
  amount: string;
  quote: Quote;
  status: SwapStatus;
  steps: Step[];
  outcome: Outcome | null;
  balanceRaw: bigint;
  setMode: (next: Mode) => void;
  flip: () => void;
  setAmount: (next: string) => void;
  fillMax: () => void;
  submit: () => void;
  reset: () => void;
}

export function useSwap({
  session,
  balances,
  fees,
  onSettled,
}: {
  session: Session | null;
  balances: Balances;
  fees: Fees;
  onSettled: () => void;
}): Swap {
  const [mode, setModeState] = useState<Mode>('wrap');
  const [amount, setAmountState] = useState(DEFAULT_AMOUNT.wrap);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [steps, setSteps] = useState<Step[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const payRaw = parseAmount(amount) ?? 0n;
  const balanceRaw = mode === 'wrap' ? balances.ckbtc : balances.sats;

  const current = useMemo(
    () => quote({ mode, payRaw, balanceRaw, fees }),
    [mode, payRaw, balanceRaw, fees]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setSteps([]);
    setOutcome(null);
  }, []);

  // Switching direction resets the field to that mode's default, so a ckBTC
  // amount never lingers in a SATS field where it would mean 1e8 times less.
  const setMode = useCallback(
    (next: Mode) => {
      setModeState(next);
      setAmountState(DEFAULT_AMOUNT[next]);
      reset();
    },
    [reset]
  );

  const flip = useCallback(
    () => setMode(mode === 'wrap' ? 'unwrap' : 'wrap'),
    [mode, setMode]
  );

  const setAmount = useCallback((next: string) => {
    if (isAmountInput(next)) setAmountState(next);
  }, []);

  const fillMax = useCallback(() => {
    setAmountState(toDecimalString(maxPayable(mode, balanceRaw, fees)));
  }, [mode, balanceRaw, fees]);

  const fail = useCallback((failure: Omit<Failure, 'kind'>) => {
    setOutcome({ kind: 'error', ...failure });
    setStatus('error');
  }, []);

  const runWrap = useCallback(
    async (active: Session) => {
      // The allowance has to cover the amount plus the fee the backend's
      // transfer_from will pay; the approve call is charged its own fee on top.
      const approveRaw = payRaw + fees.ckbtcLedger;
      const approveLabel = `${formatRaw(approveRaw)} ckBTC`;
      setSteps([{ label: `Approving ${approveLabel}`, done: false }]);

      let approved;
      try {
        // Optional Candid fields are plain optional properties in the generated
        // bindings, so anything not being set is simply omitted.
        approved = await active.ckbtc.icrc2_approve({
          amount: approveRaw,
          spender: { owner: Principal.fromText(SATSCanisterID) },
          fee: fees.ckbtcLedger,
          created_at_time: BigInt(Date.now()) * 1_000_000n,
        });
      } catch (error) {
        console.error('Error occurred when approving ckBTC:', error);
        return fail(APPROVE_FAILED(describeError(error)));
      }

      if (approved.__kind__ !== 'Ok') {
        return fail(APPROVE_FAILED(describeError(approved.Err)));
      }

      setSteps([
        { label: `Approved ${approveLabel}`, done: true },
        { label: 'Depositing to mint SATS…', done: false },
      ]);

      let deposited;
      try {
        deposited = await active.backend.deposit(null, payRaw);
      } catch (error) {
        console.error('Failed when depositing ckBTC to mint SATS:', error);
        return fail(DEPOSIT_FAILED(describeError(error)));
      }

      if (deposited.__kind__ !== 'ok') {
        return fail(DEPOSIT_FAILED(describeError(deposited.err)));
      }

      const [ckbtcBlock, satsBlock] = deposited.ok;
      setOutcome({
        kind: 'success',
        receiveRaw: current.receiveRaw,
        caption: 'SATS minted',
        ckbtcBlock,
        satsBlock,
      });
      setStatus('success');
    },
    [payRaw, fees, current.receiveRaw, fail]
  );

  const runUnwrap = useCallback(
    async (active: Session) => {
      setSteps([
        { label: `Burning ${formatRaw(current.totalRaw)} SATS`, done: false },
      ]);

      let withdrawn;
      try {
        // No approval step: withdraw burns from the caller's balance directly,
        // and the fee comes out of the released ckBTC rather than on top.
        withdrawn = await active.backend.withdraw(null, payRaw);
      } catch (error) {
        console.error('Burning SATS and returning ckBTC failed:', error);
        return fail(WITHDRAW_FAILED(describeError(error)));
      }

      if (withdrawn.__kind__ !== 'ok') {
        return fail(WITHDRAW_FAILED(describeError(withdrawn.err)));
      }

      const [satsBlock, ckbtcBlock] = withdrawn.ok;
      setOutcome({
        kind: 'success',
        receiveRaw: current.receiveRaw,
        caption: 'ckBTC released',
        ckbtcBlock,
        satsBlock,
      });
      setStatus('success');
    },
    [payRaw, current.totalRaw, current.receiveRaw, fail]
  );

  const submit = useCallback(() => {
    if (!session || !current.canSubmit || status === 'pending') return;

    setStatus('pending');
    setOutcome(null);

    const run = mode === 'wrap' ? runWrap : runUnwrap;
    run(session).finally(() => onSettled());
  }, [session, current.canSubmit, status, mode, runWrap, runUnwrap, onSettled]);

  return {
    mode,
    amount,
    quote: current,
    status,
    steps,
    outcome,
    balanceRaw,
    setMode,
    flip,
    setAmount,
    fillMax,
    submit,
    reset,
  };
}

const APPROVE_FAILED = (reason: string): Omit<Failure, 'kind'> => ({
  title: 'Approval rejected',
  body: 'The ckBTC allowance was never granted, so nothing left your account.',
  code: 'ICRC2_APPROVE → ERR',
  reason,
});

const DEPOSIT_FAILED = (reason: string): Omit<Failure, 'kind'> => ({
  title: 'Deposit failed',
  body: 'The allowance was granted but the deposit never completed, so it is still outstanding against your account.',
  code: 'DEPOSIT → ERR',
  reason,
});

const WITHDRAW_FAILED = (reason: string): Omit<Failure, 'kind'> => ({
  title: 'Unwrap rejected',
  body: 'Nothing was burned — your SATS balance is unchanged.',
  code: 'WITHDRAW → ERR',
  reason,
});
