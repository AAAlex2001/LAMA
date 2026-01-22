'use client';

import styles from './MonthDaySelector.module.scss';

interface MonthDaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export default function MonthDaySelector({ selectedDays, onChange }: MonthDaySelectorProps) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  // Grid of days 1-31, 7 columns
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const rows: number[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>Какого числа:</div>
      <div className={styles.calendar}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.calendarRow}>
              {row.map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    className={`${styles.calendarDay} ${isSelected ? styles.calendarDaySelected : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
              {/* Fill empty cells in last row */}
              {row.length < 7 &&
                Array.from({ length: 7 - row.length }, (_, i) => (
                  <div key={`empty-${i}`} className={styles.calendarDayEmpty} />
                ))}
            </div>
          ))}
        </div>
    </div>
  );
}
