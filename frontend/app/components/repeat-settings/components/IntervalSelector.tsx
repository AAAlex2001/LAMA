'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';

export type IntervalType = 'days' | 'weeks' | 'months' | 'years';

interface IntervalSelectorProps {
  value: IntervalType;
  onChange: (value: IntervalType) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function IntervalSelector({
  value,
  onChange,
  isOpen,
  onOpenChange,
}: IntervalSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpen === 'boolean';
  const open = isControlled ? isOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

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
        onClick={() => setOpen(!open)}
      >
        <span className={styles.repeatDailyRowLabel}>Настроить</span>
        <div className={styles.repeatDailyRowValue}>
          <span className={styles.repeatDailyRowValueText}>{displayText}</span>
          <ChevronDownIcon
            width={14}
            height={14}
            color="#858585"
            className={`${styles.frequencyChevron} ${open ? styles.frequencyChevronRotated : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className={styles.publishTimeDropdown}>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'days'}
              onChange={() => {
                onChange('days');
                setOpen(false);
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
                setOpen(false);
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
                setOpen(false);
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
                setOpen(false);
              }}
            />
            <span className={styles.optionLabel}>По годам</span>
          </div>
        </div>
      )}
    </div>
  );
}
