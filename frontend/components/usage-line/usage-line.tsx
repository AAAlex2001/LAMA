import styles from './usage-line.module.scss';

interface UsageLineProps {
  label: string;
  current: number;
  total: number;
  barColor?: string;
  barBackground?: string;
  hint?: string;
}

export default function UsageLine({
  label,
  current,
  total,
  barColor = '#717182',
  barBackground = '#CDCCD0',
  hint,
}: UsageLineProps) {
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;
  const percentage = `${Math.round(ratio * 100)}%`;

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>
          {current} из {total}
        </span>
      </div>
      <div className={styles.barWrapper}>
        <div
          className={styles.bar}
          style={{
            ['--bar-bg' as any]: barBackground,
            ['--bar-color' as any]: barColor,
          }}
        >
          <div className={styles.barFill} style={{ width: percentage }} />
        </div>
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
