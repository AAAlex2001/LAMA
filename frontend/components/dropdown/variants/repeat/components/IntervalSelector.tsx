'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';

export type IntervalType = 'days' | 'weeks' | 'months' | 'years';

interface IntervalSelectorProps {
  value: IntervalType;
  onChange: (value: IntervalType) => void;
}

export default function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayLabels: Record<IntervalType, string> = {
    days: 'По дням',
    weeks: 'По неделям',
    months: 'По месяцам',
    years: 'По годам',
  };

  const displayText = displayLabels[value];

  return (
    <div className={styles.publishTimeWrapper}>
      <button
        type="button"
        className={styles.repeatDailyRow}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.repeatDailyRowLabel}>Настроить</span>
        <div className={styles.repeatDailyRowValue}>
          <span className={styles.repeatDailyRowValueText}>{displayText}</span>
          <ChevronDownIcon width={14} height={14} color="#858585" />
        </div>
      </button>

      {isOpen && (
        <div className={styles.publishTimeDropdown}>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'days'}
              onChange={() => {
                onChange('days');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>По дням</span>
          </div>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'weeks'}
              onChange={() => {
                onChange('weeks');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>По неделям</span>
          </div>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'months'}
              onChange={() => {
                onChange('months');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>По месяцам</span>
          </div>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'years'}
              onChange={() => {
                onChange('years');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>По годам</span>
          </div>
        </div>
      )}
    </div>
  );
}
