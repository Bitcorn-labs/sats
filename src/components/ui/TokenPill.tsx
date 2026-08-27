import type { Ticker } from '../../lib/tokens';
import TokenIcon from './TokenIcon';
import styles from './TokenPill.module.css';

export default function TokenPill({ ticker }: { ticker: Ticker }) {
  return (
    <span className={styles.pill}>
      <TokenIcon ticker={ticker} size={24} />
      <span className={styles.ticker}>{ticker}</span>
    </span>
  );
}
