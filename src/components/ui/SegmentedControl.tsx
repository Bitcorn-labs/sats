import styles from './SegmentedControl.module.css';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className={styles.track} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`${styles.option} ${
            option.value === value ? styles.active : ''
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
