'use client';

import styles from './auto-delete.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import TimeDurationPicker from '@/components/time-duration-picker';
import type { AutoDeleteContentProps } from './types';

export default function AutoDeleteContent({
  autoDeleteValue,
  autoDeleteCustomDays,
  autoDeleteCustomHours,
  onAutoDeleteChange,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,
}: AutoDeleteContentProps) {
  const isCustomActive = autoDeleteValue !== 'never';

  const handlePreset = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    onAutoDeleteCustomDaysChange?.(days);
    onAutoDeleteCustomHoursChange?.(remainingHours);
    onAutoDeleteChange?.('custom');
  };

  return (
    <div className={styles.content}>
      <span className={styles.deleteLabel}>Удалить через:</span>

      <div className={styles.optionRow}>
        <Checkbox
          variant="radio"
          checked={autoDeleteValue === 'never'}
          onChange={() => onAutoDeleteChange?.('never')}
        />
        <span className={styles.optionLabel}>Никогда</span>
      </div>

      <div className={styles.optionRow}>
        <Checkbox
          variant="radio"
          checked={isCustomActive}
          onChange={() => {
            if (!isCustomActive) {
              onAutoDeleteChange?.('custom');
            }
          }}
        />
        <span className={styles.optionLabel}>Удалить через</span>
      </div>

      {isCustomActive && (
        <div className={styles.pickerSection}>
          <TimeDurationPicker
            days={autoDeleteCustomDays}
            hours={autoDeleteCustomHours}
            onDaysChange={(val) => {
              onAutoDeleteCustomDaysChange?.(val);
              onAutoDeleteChange?.('custom');
            }}
            onHoursChange={(val) => {
              onAutoDeleteCustomHoursChange?.(val);
              onAutoDeleteChange?.('custom');
            }}
            maxDays={365}
          />

          <div className={styles.presetsRow}>
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => handlePreset(24)}
            >
              24 часа
            </button>
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => handlePreset(48)}
            >
              48 часов
            </button>
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => handlePreset(72)}
            >
              72 часа
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
