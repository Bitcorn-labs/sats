import { formatRaw } from '../lib/format';
import type { Mode } from '../lib/swap';
import type { Outcome } from '../hooks/useSwap';
import styles from './SwapOutcome.module.css';

export default function SwapOutcome({
  outcome,
  mode,
  onDismiss,
}: {
  outcome: Outcome;
  mode: Mode;
  onDismiss: () => void;
}) {
  if (outcome.kind === 'error') {
    return (
      <div className={styles.outcome}>
        <div className={`${styles.status} ${styles.statusError}`}>REJECTED</div>
        <div className={styles.title}>{outcome.title}</div>
        <p className={styles.body}>{outcome.body}</p>
        <div className={styles.reason}>
          {outcome.code}
          <br />
          {outcome.reason}
        </div>
        <button
          type="button"
          className={`${styles.again} ${styles.primary}`}
          onClick={onDismiss}
        >
          Try again
        </button>
      </div>
    );
  }

  const [whole, fraction] = formatRaw(outcome.receiveRaw).split('.');

  return (
    <div className={styles.outcome}>
      <div className={styles.status}>SUCCESS</div>
      <div className={styles.headline}>
        +{whole}
        <span className={styles.fraction}>.{fraction}</span>
      </div>
      <div className={styles.caption}>{outcome.caption}</div>
      <div className={styles.blocks}>
        <div className={styles.blockRow}>
          <span>CKBTC BLOCK</span>
          <span className={styles.blockValue}>
            {outcome.ckbtcBlock.toLocaleString('en-US')}
          </span>
        </div>
        <div className={styles.blockRow}>
          <span>SATS BLOCK</span>
          <span className={styles.blockValue}>
            {outcome.satsBlock.toLocaleString('en-US')}
          </span>
        </div>
      </div>
      <button
        type="button"
        className={`${styles.again} ${styles.secondary}`}
        onClick={onDismiss}
      >
        {mode === 'wrap' ? 'Wrap more' : 'Unwrap more'}
      </button>
    </div>
  );
}
