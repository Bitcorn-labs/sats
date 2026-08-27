import satsMark from '../assets/sats_black.svg';
import { truncatePrincipal } from '../lib/format';
import type { Tab } from '../lib/tabs';
import { TABS } from '../lib/tabs';
import styles from './Header.module.css';

export default function Header({
  principal,
  tab,
  onTab,
  onSignIn,
  onSignOut,
  connecting,
}: {
  principal: string | null;
  tab: Tab;
  onTab: (next: Tab) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  connecting: boolean;
}) {
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.brand}
        onClick={() => onTab('swap')}
      >
        <span className={styles.mark}>
          <img src={satsMark} alt="" width={24} height={24} />
        </span>
        <span className={styles.wordmark}>Sats</span>
      </button>

      {principal && (
        <nav className={styles.nav}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => onTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className={styles.right}>
        {principal ? (
          <>
            <span className={styles.principal} title={principal}>
              <span className={styles.dot} />
              <span className={`${styles.principalText} ${styles.full}`}>
                {truncatePrincipal(principal)}
              </span>
              <span className={`${styles.principalText} ${styles.short}`}>
                {truncatePrincipal(principal, 5, 3)}
              </span>
            </span>
            <button
              type="button"
              className={styles.signOut}
              onClick={onSignOut}
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.connect}
            onClick={onSignIn}
            disabled={connecting}
          >
            <span className={styles.connectDot} />
            <span>
              {connecting ? 'Connecting…' : 'Connect Internet Identity'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
