import { useEffect, useState } from 'react';
import { formatRaw, trimTrailingZeros } from '../lib/format';
import type { Fees } from '../lib/swap';
import type { Ticker } from '../lib/tokens';
import type { Balances } from '../hooks/useLedgerData';
import type { Send } from '../hooks/useSend';
import Card from './ui/Card';
import TokenIcon from './ui/TokenIcon';
import SendCard from './SendCard';
import styles from './WalletTab.module.css';

const COPIED_MS = 1600;

export default function WalletTab({
  principal,
  balances,
  fees,
  send,
}: {
  principal: string;
  balances: Balances;
  fees: Fees;
  send: Send;
}) {
  const rows: { ticker: Ticker; meta: string; raw: bigint }[] = [
    {
      ticker: 'ckBTC',
      meta: `FEE ${fees.ckbtcLedger} SATS · 8 DECIMALS`,
      raw: balances.ckbtc,
    },
    {
      ticker: 'SATS',
      meta: `FEE ${trimTrailingZeros(
        formatRaw(fees.satsTransfer)
      )} · 8 DECIMALS`,
      raw: balances.sats,
    },
  ];

  return (
    <div className={styles.grid}>
      <div className={styles.column}>
        <Card size="roomy">
          <h2 className={styles.title}>Balances</h2>
          <div className={styles.rows}>
            {rows.map((row) => (
              <div key={row.ticker} className={styles.balance}>
                <span className={styles.token}>
                  <TokenIcon ticker={row.ticker} size={32} />
                  <span>
                    <span className={styles.ticker}>{row.ticker}</span>
                    <div className={styles.tokenMeta}>{row.meta}</div>
                  </span>
                </span>
                <span className={styles.amount}>{formatRaw(row.raw)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card size="roomy">
          <h2 className={styles.receiveTitle}>Receive</h2>
          <p className={styles.receiveBody}>
            Both tokens arrive at the same principal. There is no separate
            deposit address.
          </p>
          <div className={styles.receiveRow}>
            <div className={styles.principal}>{principal}</div>
            <CopyButton value={principal} />
          </div>
          <div className={styles.warning}>
            NEVER SEND TO THE SATS CANISTER ID — A TRANSFER TO THE MINTING
            ACCOUNT IS A BURN. UNWRAP INSTEAD.
          </div>
        </Card>
      </div>

      <SendCard send={send} />
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy!', error);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.copy} ${copied ? styles.copied : ''}`}
      onClick={copy}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
