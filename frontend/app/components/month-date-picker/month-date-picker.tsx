'use client';

import styles from './month-date-picker.module.scss';

interface MonthDatePickerProps {
  selectedDates: number[];
  onChange: (date: number) => void;
}

export default function MonthDatePicker({ selectedDates, onChange }: MonthDatePickerProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const rows = [];
  
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <div className={styles.monthDatePicker}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.row}>
          {row.map(day => (
            <button
              key={day}
              type="button"
              className={`${styles.day} ${selectedDates.includes(day) ? styles.selected : ''}`}
              onClick={() => onChange(day)}
            >
              {day}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
