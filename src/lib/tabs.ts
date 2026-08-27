export type Tab = 'swap' | 'wallet';

export const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'swap', label: 'Swap' },
  { id: 'wallet', label: 'Wallet' },
];
