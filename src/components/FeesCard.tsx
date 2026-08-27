import { formatRaw, trimTrailingZeros } from '../lib/format';
import { unwrapFeeRawCkbtc, wrapFeeRawCkbtc, type Fees } from '../lib/swap';
import Card from './ui/Card';
import styles from './FeesCard.module.css';

export default function FeesCard({ fees }: { fees: Fees }) {
  const rows = [
    { label: 'Wrap', value: `${wrapFeeRawCkbtc(fees)} raw ckBTC` },
    { label: 'Unwrap', value: `${unwrapFeeRawCkbtc(fees)} raw ckBTC` },
    {
      label: 'SATS transfer',
      value: `${trimTrailingZeros(formatRaw(fees.satsTransfer))} SATS`,
      accent: true,
    },
    { label: 'ckBTC transfer', value: `${fees.ckbtcLedger} sats` },
  ];

  return (
    <Card>
      <div className={styles.title}>Fees</div>
      <div className={styles.rows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <span className={styles.label}>{row.label}</span>
            <span
              className={`${styles.value} ${row.accent ? styles.accent : ''}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
