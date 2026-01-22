'use client';

import styles from './auto-delete.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import TimeDurationPicker from '@/components/time-duration-picker';
import type { AutoDeleteContentProps, AutoDeleteOption } from '../../types';

type AutoDeleteOptionItem = { id: AutoDeleteOption; label: string };

const AUTO_DELETE_OPTIONS: AutoDeleteOptionItem[] = [
  { id: 'never', label: 'Никогда' },
  { id: '24h', label: '24 часа' },
  { id: '48h', label: '48 часов' },
  { id: '72h', label: '72 часа' },
  { id: 'custom', label: 'Другой вариант' },
];

export default function AutoDeleteContent({
  autoDeleteValue,
  autoDeleteCustomDays,
  autoDeleteCustomHours,
  onAutoDeleteChange,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,
}: AutoDeleteContentProps) {
  return (
    <>
      <span className={styles.deleteLabel}>Удалить через:</span>
      <div className={styles.optionsList}>
        {AUTO_DELETE_OPTIONS.map((option) => (
          <div key={option.id} className={styles.optionRow}>
            <Checkbox
              variant="radio"
              checked={autoDeleteValue === option.id}
              onChange={() => onAutoDeleteChange?.(option.id)}
            />
            <span className={styles.optionLabel}>{option.label}</span>
          </div>
        ))}
      </div>

      {autoDeleteValue === 'custom' && (
        <TimeDurationPicker
          days={autoDeleteCustomDays}
          hours={autoDeleteCustomHours}
          onDaysChange={(val) => onAutoDeleteCustomDaysChange?.(val)}
          onHoursChange={(val) => onAutoDeleteCustomHoursChange?.(val)}
          maxDays={365}
        />
      )}
    </>
  );
}
