import type { ReactNode } from 'react';
import styles from './Card.module.css';

/// `flush` drops the padding for cards whose rows run edge to edge.
export default function Card({
  children,
  size = 'default',
  className,
}: {
  children: ReactNode;
  size?: 'default' | 'roomy' | 'flush';
  className?: string;
}) {
  return (
    <section
      className={`${styles.card} ${size !== 'default' ? styles[size] : ''} ${
        className ?? ''
      }`}
    >
      {children}
    </section>
  );
}
