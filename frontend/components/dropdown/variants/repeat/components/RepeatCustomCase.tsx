'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import IntervalSelector, { type IntervalType } from './IntervalSelector';
import IntervalValuePicker from './IntervalValuePicker';

interface RepeatCustomCaseProps {
  onBack: () => void;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export default function RepeatCustomCase({ onBack }: RepeatCustomCaseProps) {
  const [intervalType, setIntervalType] = useState<IntervalType>('days');
  const [intervalValue, setIntervalValue] = useState(1);

  const getIntervalLabel = (type: IntervalType, value: number): string => {
    switch (type) {
      case 'days':
        return pluralize(value, 'день', 'дня', 'дней');
      case 'weeks':
        return pluralize(value, 'неделю', 'недели', 'недель');
      case 'months':
        return pluralize(value, 'месяц', 'месяца', 'месяцев');
      case 'years':
        return pluralize(value, 'год', 'года', 'лет');
    }
  };

  const getEveryLabel = (type: IntervalType, value: number): string => {
    // "Каждую" for weeks (неделю - feminine)
    // "Каждый" for day/month/year when value = 1
    // "Каждые" for plural (2+)
    if (value === 1) {
      if (type === 'weeks') return 'Каждую';
      return 'Каждый';
    }
    return 'Каждые';
  };

  return (
    <div className={styles.repeatDaily}>
      <div className={styles.repeatDailyTopRow}>
        <div className={styles.repeatDailySelector}>
          <span className={styles.repeatDailySelectorText}>Настройка повтора</span>
        </div>
      </div>

      <IntervalSelector value={intervalType} onChange={setIntervalType} />

      <div className={styles.repeatCustomIntervalRow}>
        <span className={styles.repeatCustomIntervalText}>{getEveryLabel(intervalType, intervalValue)}</span>
        <span className={styles.repeatCustomIntervalValueActive}>
          {getIntervalLabel(intervalType, intervalValue)}
        </span>
      </div>

      <IntervalValuePicker
        value={intervalValue}
        onChange={setIntervalValue}
        label={getIntervalLabel(intervalType, intervalValue)}
      />
    </div>
  );
}
