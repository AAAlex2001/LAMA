'use client';

import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import TimeDurationPicker from '@/components/time-duration-picker';
import type { RepeatOption } from '../../../types';

type RepeatOptionItem = { id: RepeatOption; label: string };

const REPEAT_OPTIONS: RepeatOptionItem[] = [
  { id: 'never', label: 'Никогда' },
  { id: 'daily', label: 'Каждый день' },
  { id: 'weekly', label: 'Каждую неделю' },
  { id: 'biweekly', label: 'Каждые 2 недели' },
  { id: 'monthly', label: 'Каждый месяц' },
  { id: 'yearly', label: 'Каждый год' },
  { id: 'custom', label: 'Другой вариант' },
];

interface RepeatDefaultCaseProps {
  repeatValue: RepeatOption;
  repeatCustomDays: number;
  repeatCustomHours: number;
  onRepeatChange?: (value: RepeatOption) => void;
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
}

export default function RepeatDefaultCase({
  repeatValue,
  onRepeatChange,
  repeatCustomDays,
  repeatCustomHours,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
}: RepeatDefaultCaseProps) {
  return (
    <>
      <div className={styles.repeatList}>
        {REPEAT_OPTIONS.map((option) => (
          <div key={option.id} className={styles.repeatRow}>
            <Checkbox
              variant="radio"
              checked={repeatValue === option.id}
              onChange={() => onRepeatChange?.(option.id)}
            />
            <span className={styles.optionLabel}>{option.label}</span>
          </div>
        ))}
      </div>

      {repeatValue === 'custom' && (
        <TimeDurationPicker
          days={repeatCustomDays}
          hours={repeatCustomHours}
          onDaysChange={(val) => onRepeatCustomDaysChange?.(val)}
          onHoursChange={(val) => onRepeatCustomHoursChange?.(val)}
          maxDays={365}
        />
      )}
    </>
  );
}
