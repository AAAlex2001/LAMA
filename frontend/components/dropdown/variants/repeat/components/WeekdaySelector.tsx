'use client';

import styles from './WeekdaySelector.module.scss';
import Checkbox from '@/components/checkbox/checkbox';

interface WeekdaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const WEEKDAYS = [
  { id: 1, name: 'Понедельник' },
  { id: 2, name: 'Вторник' },
  { id: 3, name: 'Среда' },
  { id: 4, name: 'Четверг' },
  { id: 5, name: 'Пятница' },
  { id: 6, name: 'Суббота' },
  { id: 0, name: 'Воскресенье' },
];

export default function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      onChange(selectedDays.filter(d => d !== dayId));
    } else {
      onChange([...selectedDays, dayId]);
    }
  };

  return (
    <div className={styles.container}>
      {WEEKDAYS.map(day => (
        <div key={day.id} className={styles.row}>
          <Checkbox
            checked={selectedDays.includes(day.id)}
            onChange={() => toggleDay(day.id)}
          />
          <span className={styles.label}>{day.name}</span>
        </div>
      ))}
    </div>
  );
}
