import ckbtcIcon from '../../assets/ckbtc.png';
import satsIcon from '../../assets/sats_black.svg';
import type { Ticker } from '../../lib/tokens';
import styles from './TokenIcon.module.css';

export default function TokenIcon({
  ticker,
  size,
}: {
  ticker: Ticker;
  size: number;
}) {
  if (ticker === 'ckBTC') {
    return (
      <img
        src={ckbtcIcon}
        alt=""
        className={styles.icon}
        width={size}
        height={size}
      />
    );
  }

  return (
    <span className={styles.disc} style={{ width: size, height: size }}>
      <img
        src={satsIcon}
        alt=""
        className={styles.icon}
        width={Math.round(size * 0.75)}
        height={Math.round(size * 0.75)}
      />
    </span>
  );
}
