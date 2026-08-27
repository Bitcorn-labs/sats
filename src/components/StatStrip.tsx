import { formatRaw, trimTrailingZeros } from '../lib/format';
import type { Vault } from '../hooks/useLedgerData';
import styles from './StatStrip.module.css';

export default function StatStrip({ vault }: { vault: Vault }) {
  const cells = [
    {
      label: 'CKBTC IN VAULT',
      value: vault.ckbtcInVault === null ? null : formatRaw(vault.ckbtcInVault),
    },
    {
      label: 'SATS SUPPLY',
      // Supply only ever moves in whole SATS, so the fraction is noise here.
      value:
        vault.satsSupply === null
          ? null
          : trimTrailingZeros(formatRaw(vault.satsSupply)),
    },
    {
      label: 'HOLDERS',
      value:
        vault.holders === null ? null : vault.holders.toLocaleString('en-US'),
    },
    { label: 'BACKING', value: '1:100,000,000', accent: true },
  ];

  return (
    <div className={styles.strip}>
      {cells.map(({ label, value, accent }) => (
        <div key={label} className={styles.cell}>
          <div className={styles.label}>{label}</div>
          <div
            className={`${styles.value} ${accent ? styles.accent : ''} ${
              value === null ? styles.pending : ''
            }`}
          >
            {value ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
