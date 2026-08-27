import { useCallback, useState } from 'react';
import Header from './components/Header';
import SwapTab from './components/SwapTab';
import WalletTab from './components/WalletTab';
import { useAuth } from './hooks/useAuth';
import { useLedgerData } from './hooks/useLedgerData';
import { useSend } from './hooks/useSend';
import { useSwap } from './hooks/useSwap';
import type { Tab } from './lib/tabs';
import styles from './App.module.css';

export default function App() {
  const [tab, setTab] = useState<Tab>('swap');
  const { session, connecting, signIn, signOut } = useAuth();
  const { vault, fees, balances, refresh } = useLedgerData(session);

  // A settled transaction always refetches, rather than waiting out the
  // refetch window that guards ordinary navigation.
  const onSettled = useCallback(() => refresh(true), [refresh]);

  const swap = useSwap({ session, balances, fees, onSettled });
  const send = useSend({ session, balances, fees, onSettled });

  const connected = session !== null;
  // The nav only exists while signed in, so a stale tab must not outlive it.
  const active: Tab = connected ? tab : 'swap';

  const handleSignOut = () => {
    setTab('swap');
    swap.reset();
    void signOut();
  };

  return (
    <div className={styles.page}>
      <Header
        principal={session?.principal ?? null}
        tab={active}
        onTab={setTab}
        onSignIn={() => void signIn()}
        onSignOut={handleSignOut}
        connecting={connecting}
      />

      <main className={styles.content}>
        {active === 'swap' ? (
          <SwapTab
            vault={vault}
            fees={fees}
            swap={swap}
            send={send}
            connected={connected}
            otherBalanceRaw={
              swap.mode === 'wrap' ? balances.sats : balances.ckbtc
            }
            onConnect={() => void signIn()}
            onReceive={() => setTab('wallet')}
          />
        ) : (
          <WalletTab
            principal={session!.principal}
            balances={balances}
            fees={fees}
            send={send}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <p className={styles.noticeHeading}>
          ⚠️ IMPORTANT NOTICE - NO RESPONSIBILITY DISCLAIMER ⚠️
        </p>
        <p className={styles.notice}>
          BY USING THE SATS PLATFORM, YOU EXPLICITLY ACKNOWLEDGE AND AGREE THAT
          YOU ARE USING THE PLATFORM ENTIRELY AT YOUR OWN RISK. WE ACCEPT
          ABSOLUTELY NO RESPONSIBILITY OR LIABILITY WHATSOEVER FOR ANY
          CONSEQUENCES RESULTING FROM YOUR USE OF THE PLATFORM. THIS INCLUDES,
          BUT IS NOT LIMITED TO: FINANCIAL LOSSES, TECHNICAL ISSUES, SECURITY
          BREACHES, SMART CONTRACT VULNERABILITIES, REGULATORY COMPLIANCE, OR
          ANY OTHER POTENTIAL RISKS OR DAMAGES.
        </p>
      </footer>
    </div>
  );
}
