import styles from './Spinner.module.css';

export default function Spinner({
  size = 14,
  tone = 'onDark',
}: {
  size?: number;
  tone?: 'onAccent' | 'onDark';
}) {
  return (
    <span
      className={`${styles.spinner} ${styles[tone]}`}
      style={{ width: size, height: size, borderWidth: 2 }}
    />
  );
}
