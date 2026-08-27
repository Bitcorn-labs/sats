import { SCALE, minUnwrapRawSats, type Fees } from '../lib/swap';
import Card from './ui/Card';
import styles from './ConversionTable.module.css';

const ROWS = [
  { in: '0.00001000', out: '1,000.00000000' },
  { in: '0.00010000', out: '10,000.00000000' },
  { in: '1.00000000', out: '100,000,000.00000000', accent: true },
];

export default function ConversionTable({ fees }: { fees: Fees }) {
  return (
    <Card size="flush">
      <div className={styles.head}>
        <span>CKBTC IN</span>
        <span className={styles.out}>SATS OUT</span>
      </div>
      {ROWS.map((row) => (
        <div key={row.in} className={styles.row}>
          <span className={styles.in}>{row.in}</span>
          <span className={`${styles.out} ${row.accent ? styles.accent : ''}`}>
            {row.out}
          </span>
        </div>
      ))}
      <div className={styles.footer}>
        MIN WRAP 0.00001 CKBTC · MIN UNWRAP{' '}
        {(minUnwrapRawSats(fees) / SCALE).toString()} SATS · WITHDRAWALS FLOOR
        TO WHOLE SATOSHIS
      </div>
    </Card>
  );
}
