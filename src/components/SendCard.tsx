import { formatRaw, trimTrailingZeros } from '../lib/format';
import { TICKERS } from '../lib/tokens';
import type { Send } from '../hooks/useSend';
import SegmentedControl from './ui/SegmentedControl';
import field from './ui/field.module.css';
import styles from './SendCard.module.css';

export default function SendCard({ send }: { send: Send }) {
  const message = send.recipientError ? 'Enter a valid principal' : send.error;
  const fee = `${trimTrailingZeros(formatRaw(send.feeRaw))} ${send.ticker}`;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Send</h2>
        <SegmentedControl
          label="Token to send"
          options={TICKERS.map((value) => ({ value, label: value }))}
          value={send.ticker}
          onChange={send.setTicker}
        />
      </div>

      <div className={styles.body}>
        <div>
          <div className={field.label}>To principal</div>
          <input
            className={`${field.input} ${field.inputLg} ${
              send.recipientError ? field.inputError : ''
            }`}
            placeholder="ryjl3-tyaaa-aaaaa-aaaba-cai"
            value={send.recipient}
            onChange={(event) => send.setRecipient(event.target.value.trim())}
            aria-label="Recipient principal"
          />
        </div>

        <div>
          <div className={field.labelRow}>
            <span>Amount</span>
            <span className={field.labelBalance}>
              Balance {formatRaw(send.balanceRaw)}
            </span>
          </div>
          <div className={field.row}>
            <input
              className={`${field.input} ${field.inputLg} ${field.grow}`}
              placeholder="0.00000000"
              inputMode="decimal"
              value={send.amount}
              onChange={(event) => send.setAmount(event.target.value)}
              aria-label={`Amount of ${send.ticker} to send`}
            />
            <button type="button" className={field.chip} onClick={send.fillMax}>
              MAX
            </button>
          </div>
        </div>

        <div className={styles.summary}>
          <div className={styles.row}>
            <span className={styles.label}>Transfer fee</span>
            <span className={styles.value}>{fee}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Remaining after send</span>
            <span className={styles.value}>{formatRaw(send.remainingRaw)}</span>
          </div>
        </div>

        {message && <div className={field.error}>{message}</div>}

        <button
          type="button"
          className={styles.cta}
          onClick={send.send}
          disabled={!send.canSend}
        >
          {send.sending ? 'Sending…' : `Send ${send.ticker}`}
        </button>
      </div>
    </section>
  );
}
