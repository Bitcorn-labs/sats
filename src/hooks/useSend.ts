import { useCallback, useState } from 'react';
import { Principal } from '@icp-sdk/core/principal';
import type { Icrc1Ledger } from '../actors';
import { describeError } from '../lib/errors';
import { isAmountInput, parseAmount, toDecimalString } from '../lib/format';
import type { Fees } from '../lib/swap';
import { transferFee, type Ticker } from '../lib/tokens';
import type { Balances } from './useLedgerData';
import type { Session } from './useAuth';

export interface Send {
  ticker: Ticker;
  recipient: string;
  amount: string;
  sending: boolean;
  error: string | null;
  feeRaw: bigint;
  balanceRaw: bigint;
  amountRaw: bigint;
  /// What is left after the transfer clears, fee included. Floors at zero.
  remainingRaw: bigint;
  recipientError: boolean;
  canSend: boolean;
  setTicker: (next: Ticker) => void;
  setRecipient: (next: string) => void;
  setAmount: (next: string) => void;
  fillMax: () => void;
  send: () => void;
}

export function useSend({
  session,
  balances,
  fees,
  initialTicker = 'SATS',
  onSettled,
}: {
  session: Session | null;
  balances: Balances;
  fees: Fees;
  initialTicker?: Ticker;
  onSettled: () => void;
}): Send {
  const [ticker, setTickerState] = useState<Ticker>(initialTicker);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmountState] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeRaw = transferFee(ticker, fees);
  const balanceRaw = ticker === 'SATS' ? balances.sats : balances.ckbtc;
  const amountRaw = parseAmount(amount) ?? 0n;

  const spend = amountRaw + feeRaw;
  const remainingRaw = balanceRaw > spend ? balanceRaw - spend : 0n;
  const recipientError = recipient !== '' && !isPrincipal(recipient);

  const canSend =
    session !== null &&
    !sending &&
    amountRaw > 0n &&
    spend <= balanceRaw &&
    isPrincipal(recipient);

  const setTicker = useCallback((next: Ticker) => {
    setTickerState(next);
    setAmountState('');
    setError(null);
  }, []);

  const setAmount = useCallback((next: string) => {
    if (isAmountInput(next)) setAmountState(next);
  }, []);

  const fillMax = useCallback(() => {
    setAmountState(
      toDecimalString(balanceRaw > feeRaw ? balanceRaw - feeRaw : 0n)
    );
  }, [balanceRaw, feeRaw]);

  const send = useCallback(() => {
    if (!session || !canSend) return;

    const ledger: Icrc1Ledger =
      ticker === 'SATS' ? session.backend : session.ckbtc;
    setSending(true);
    setError(null);

    ledger
      .icrc1_transfer({
        amount: amountRaw,
        to: { owner: Principal.fromText(recipient) },
        fee: feeRaw,
        created_at_time: BigInt(Date.now()) * 1_000_000n,
      })
      .then((result) => {
        if (result.__kind__ === 'Ok') {
          setRecipient('');
          setAmountState('');
        } else {
          console.error('Transfer failed:', result.Err);
          setError(describeError(result.Err));
        }
      })
      .catch((cause) => {
        console.error('Error during token transfer:', cause);
        setError(describeError(cause));
      })
      .finally(() => {
        setSending(false);
        onSettled();
      });
  }, [session, canSend, ticker, amountRaw, recipient, feeRaw, onSettled]);

  return {
    ticker,
    recipient,
    amount,
    sending,
    error,
    feeRaw,
    balanceRaw,
    amountRaw,
    remainingRaw,
    recipientError,
    canSend,
    setTicker,
    setRecipient,
    setAmount,
    fillMax,
    send,
  };
}

function isPrincipal(value: string): boolean {
  try {
    Principal.fromText(value);
    return true;
  } catch {
    return false;
  }
}
