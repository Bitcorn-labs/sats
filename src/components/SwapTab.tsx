import type { Fees } from '../lib/swap';
import type { Vault } from '../hooks/useLedgerData';
import type { Send } from '../hooks/useSend';
import type { Swap } from '../hooks/useSwap';
import ConversionTable from './ConversionTable';
import FeesCard from './FeesCard';
import QuickSend from './QuickSend';
import StatStrip from './StatStrip';
import SwapCard from './SwapCard';
import styles from './SwapTab.module.css';

export default function SwapTab({
  vault,
  fees,
  swap,
  send,
  connected,
  otherBalanceRaw,
  onConnect,
  onReceive,
}: {
  vault: Vault;
  fees: Fees;
  swap: Swap;
  send: Send;
  connected: boolean;
  otherBalanceRaw: bigint;
  onConnect: () => void;
  onReceive: () => void;
}) {
  return (
    <>
      <StatStrip vault={vault} />
      <div className={styles.grid}>
        <div className={styles.column}>
          <SwapCard
            swap={swap}
            fees={fees}
            connected={connected}
            otherBalanceRaw={otherBalanceRaw}
            onConnect={onConnect}
          />
        </div>
        <div className={styles.column}>
          {connected ? (
            <QuickSend send={send} onReceive={onReceive} />
          ) : (
            <ConversionTable fees={fees} />
          )}
          <FeesCard fees={fees} />
        </div>
      </div>
    </>
  );
}
