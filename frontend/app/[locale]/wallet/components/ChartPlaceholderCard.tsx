'use client';

import styles from './ChartPlaceholderCard.module.scss';

const Y_AXIS = ['100', '80', '60', '40', '20', '0'];
const COLUMNS = 12;
const ROWS = 5;

interface ChartPlaceholderCardProps {
  title: string;
}

export default function ChartPlaceholderCard({ title }: ChartPlaceholderCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div className={styles.body}>
        <div className={styles.yAxis}>
          {Y_AXIS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          className={styles.grid}
          style={{
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          }}
          aria-hidden
        >
          {Array.from({ length: ROWS * COLUMNS }).map((_, idx) => (
            <div key={idx} className={styles.cell} />
          ))}
        </div>
      </div>
    </section>
  );
}
