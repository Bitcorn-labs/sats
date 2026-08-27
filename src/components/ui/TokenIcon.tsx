import ckbtcIcon from '../../assets/ckbtc.svg';
// The SATS mark the production ledger publishes as icrc1:logo
// (4fu6t-haaaa-aaaap-quxda-cai), decoded from its metadata. Using the
// ledger's own artwork keeps this app showing the same token image as
// wallets, explorers and aggregators, which all read it from there.
import satsIcon from '../../assets/sats_onchain.png';
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
