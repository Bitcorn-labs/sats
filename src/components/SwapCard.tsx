import { formatRaw, trimTrailingZeros } from '../lib/format';
import {
  MIN_WRAP_RAW_CKBTC,
  SCALE,
  minUnwrapRawSats,
  wrapFeeRawCkbtc,
  type Fees,
  type Mode,
} from '../lib/swap';
import type { Ticker } from '../lib/tokens';
import type { Swap } from '../hooks/useSwap';
import SegmentedControl from './ui/SegmentedControl';
import Spinner from './ui/Spinner';
import TokenPill from './ui/TokenPill';
import SwapOutcome from './SwapOutcome';
import styles from './SwapCard.module.css';

const TITLE: Record<Mode, string> = { wrap: 'Wrap', unwrap: 'Unwrap' };
const MODES = [
  { value: 'wrap' as Mode, label: TITLE.wrap },
  { value: 'unwrap' as Mode, label: TITLE.unwrap },
];
const PAYS: Record<Mode, Ticker> = { wrap: 'ckBTC', unwrap: 'SATS' };
const RECEIVES: Record<Mode, Ticker> = { wrap: 'SATS', unwrap: 'ckBTC' };

export default function SwapCard({
  swap,
  fees,
  connected,
  otherBalanceRaw,
  onConnect,
}: {
  swap: Swap;
  fees: Fees;
  connected: boolean;
  /// Balance of the token being received, for the lower panel's caption.
  otherBalanceRaw: bigint;
  onConnect: () => void;
}) {
  const { mode, quote, status } = swap;
  const pending = status === 'pending';
  const pays = PAYS[mode];

  const minWrap = trimTrailingZeros(formatRaw(MIN_WRAP_RAW_CKBTC));
  const minUnwrap = (minUnwrapRawSats(fees) / SCALE).toString();

  const disabled = connected && (!quote.canSubmit || pending);
  const showError = connected && (quote.belowMinimum || quote.insufficient);

  const note = () => {
    if (!connected)
      return {
        text: 'PREVIEW ONLY — CONNECT TO WRAP OR UNWRAP',
        danger: false,
      };
    if (pending) return { text: 'DO NOT CLOSE THIS TAB', danger: false };
    if (quote.insufficient)
      return { text: `You don't have enough ${pays}`, danger: true };
    if (quote.belowMinimum)
      return {
        text:
          mode === 'wrap'
            ? `BELOW MINIMUM — ${minWrap} CKBTC REQUIRED`
            : `BELOW MINIMUM — ${minUnwrap} SATS REQUIRED`,
        danger: true,
      };
    return {
      text:
        mode === 'wrap'
          ? `MIN ${minWrap} CKBTC · APPROVE THEN DEPOSIT`
          : `MIN ${minUnwrap} SATS · WHOLE SATOSHIS ONLY`,
      danger: false,
    };
  };

  const ctaLabel = () => {
    if (!connected) return 'Connect Internet Identity';
    if (pending) return mode === 'wrap' ? 'Approving…' : 'Burning…';
    return mode === 'wrap' ? 'Approve & wrap' : 'Unwrap to ckBTC';
  };

  const { text: noteText, danger: noteDanger } = note();

  return (
    <section
      className={`${styles.card} ${
        status === 'success' ? styles.cardSuccess : ''
      } ${status === 'error' ? styles.cardError : ''}`}
    >
      <div className={styles.head}>
        <h2 className={styles.title}>{TITLE[mode]}</h2>
        <SegmentedControl
          label="Swap direction"
          options={MODES}
          value={mode}
          onChange={swap.setMode}
        />
      </div>

      {swap.outcome ? (
        <SwapOutcome
          outcome={swap.outcome}
          mode={mode}
          onDismiss={swap.reset}
        />
      ) : (
        <>
          <div
            className={`${styles.panel} ${showError ? styles.panelError : ''}`}
          >
            <div className={styles.panelHead}>
              <span className={styles.fieldLabel}>You pay</span>
              <span className={styles.balance}>
                <span className={styles.balanceValue}>
                  {connected
                    ? `Balance ${formatRaw(swap.balanceRaw)}`
                    : 'Balance —'}
                </span>
                {connected && (
                  <button
                    type="button"
                    className={styles.max}
                    onClick={swap.fillMax}
                  >
                    MAX
                  </button>
                )}
              </span>
            </div>
            <div className={styles.panelBody}>
              <TokenPill ticker={pays} />
              <input
                className={`${styles.amount} ${
                  showError ? styles.amountError : ''
                }`}
                value={swap.amount}
                onChange={(event) => swap.setAmount(event.target.value)}
                inputMode="decimal"
                disabled={pending}
                aria-label={`Amount of ${pays} to ${mode}`}
              />
            </div>
          </div>

          <div className={styles.flipRow}>
            <button
              type="button"
              className={styles.flip}
              onClick={swap.flip}
              aria-label="Swap direction"
              title="Swap direction"
            >
              ⇅
            </button>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.fieldLabel}>You receive</span>
              <span className={styles.balance}>
                <span className={styles.balanceValue}>
                  {connected
                    ? `Balance ${formatRaw(otherBalanceRaw)}`
                    : 'Balance —'}
                </span>
              </span>
            </div>
            <div className={styles.panelBody}>
              <TokenPill ticker={RECEIVES[mode]} />
              <span className={styles.receive}>
                {formatRaw(quote.receiveRaw)}
              </span>
            </div>
          </div>

          {pending ? (
            <div className={styles.steps}>
              {swap.steps.map((step) => (
                <div
                  key={step.label}
                  className={`${styles.step} ${
                    step.done ? styles.stepDone : ''
                  }`}
                >
                  <span
                    className={`${styles.stepDot} ${
                      step.done ? styles.stepDotDone : ''
                    }`}
                  />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.breakdown}>
              {mode === 'wrap' ? (
                <>
                  <Row label="Rate" value="1 sat = 1.00000000 SATS" />
                  <Row
                    label="Ledger fees ×2"
                    value={`${formatRaw(wrapFeeRawCkbtc(fees))} ckBTC`}
                  />
                  <Row label="Protocol fee" value="None" muted />
                  <div className={styles.divider} />
                  <Row
                    label="Total debited"
                    value={`${formatRaw(quote.totalRaw)} ckBTC`}
                    total
                  />
                </>
              ) : (
                <>
                  <Row label="Rate" value="1.00000000 SATS = 1 sat" />
                  <Row
                    label="ckBTC network fee"
                    value={`${fees.ckbtcLedger} sats`}
                  />
                  <Row label="Protocol fee" value={`${fees.protocol} sats`} />
                  {quote.remainderRaw > 0n && (
                    <Row
                      label="Kept in your balance"
                      value={`${formatRaw(quote.remainderRaw)} SATS`}
                    />
                  )}
                  <div className={styles.divider} />
                  <Row
                    label="Total burned"
                    value={`${formatRaw(quote.totalRaw)} SATS`}
                    total
                  />
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className={`${styles.cta} ${disabled ? styles.ctaDisabled : ''}`}
            onClick={connected ? swap.submit : onConnect}
            disabled={disabled}
          >
            {pending && <Spinner size={14} />}
            <span>{ctaLabel()}</span>
          </button>

          <div
            className={`${styles.note} ${noteDanger ? styles.noteDanger : ''}`}
          >
            {noteText}
          </div>
        </>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  muted,
  total,
}: {
  label: string;
  value: string;
  muted?: boolean;
  total?: boolean;
}) {
  return (
    <div className={`${styles.row} ${total ? styles.total : ''}`}>
      <span className={total ? undefined : styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${muted ? styles.rowMuted : ''}`}>
        {value}
      </span>
    </div>
  );
}
