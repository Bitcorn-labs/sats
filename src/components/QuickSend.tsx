import { formatRaw, trimTrailingZeros } from '../lib/format';
import type { Send } from '../hooks/useSend';
import Card from './ui/Card';
import field from './ui/field.module.css';
import styles from './QuickSend.module.css';

export default function QuickSend({
  send,
  onReceive,
}: {
  send: Send;
  onReceive: () => void;
}) {
  const message = send.recipientError ? 'Enter a valid principal' : send.error;

  return (
    <Card>
      <div className={styles.head}>
        <span className={styles.title}>Send SATS</span>
        <button type="button" className={styles.link} onClick={onReceive}>
          Receive ↗
        </button>
      </div>
      <div className={styles.body}>
        <input
          className={`${field.input} ${
            send.recipientError ? field.inputError : ''
          }`}
          placeholder="Recipient principal"
          value={send.recipient}
          onChange={(event) => send.setRecipient(event.target.value.trim())}
          aria-label="Recipient principal"
        />
        <div className={field.row}>
          <input
            className={`${field.input} ${field.grow}`}
            placeholder="0.00000000"
            inputMode="decimal"
            value={send.amount}
            onChange={(event) => send.setAmount(event.target.value)}
            aria-label="Amount of SATS to send"
          />
          <button type="button" className={field.chip} onClick={send.fillMax}>
            MAX
          </button>
          <button
            type="button"
            className={field.send}
            onClick={send.send}
            disabled={!send.canSend}
          >
            {send.sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {message && <div className={field.error}>{message}</div>}
        <div className={field.footnote}>
          FEE {trimTrailingZeros(formatRaw(send.feeRaw))} SATS · REMAINING{' '}
          {formatRaw(send.remainingRaw)}
        </div>
      </div>
    </Card>
  );
}
