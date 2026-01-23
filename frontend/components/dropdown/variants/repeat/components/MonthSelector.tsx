'use client';

import styles from './MonthSelector.module.scss';

interface MonthSelectorProps {
  selectedMonth: number;
  onChange: (month: number) => void;
}

const MONTHS = [
  ['Янв', 'Фев', 'Мар', 'Апр'],
  ['Май', 'Июн', 'Июл', 'Авг'],
  ['Сен', 'Окт', 'Ноя', 'Дек'],
];

export default function MonthSelector({ selectedMonth, onChange }: MonthSelectorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {MONTHS.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.row}>
            {row.map((month, colIndex) => {
              const monthIndex = rowIndex * 4 + colIndex;
              const isSelected = selectedMonth === monthIndex;
              return (
                <button
                  key={monthIndex}
                  className={`${styles.month} ${isSelected ? styles.selected : ''}`}
                  onClick={() => onChange(monthIndex)}
                >
                  {month}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
