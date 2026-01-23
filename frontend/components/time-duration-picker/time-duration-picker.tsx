'use client';

import { WheelPicker } from '@/components/wheel-picker';
import styles from './time-duration-picker.module.scss';

interface TimeDurationPickerProps {
  days: number;
  hours: number;
  onDaysChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  maxDays?: number;
}

export default function TimeDurationPicker({
  days,
  hours,
  onDaysChange,
  onHoursChange,
  maxDays = 365,
}: TimeDurationPickerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.labelsRow}>
        <span className={styles.label}>дней</span>
        <span className={styles.labelSpacer} />
        <span className={styles.label}>часов</span>
      </div>

      <div className={styles.columnsWrapper}>
        <WheelPicker
          value={days}
          onChange={onDaysChange}
          min={0}
          max={maxDays}
        />

        <div className={styles.separatorColumn}>
          <span className={styles.separator}>:</span>
          <span className={styles.activeSeparator}>:</span>
          <span className={styles.separator}>:</span>
        </div>

        <WheelPicker
          value={hours}
          onChange={onHoursChange}
          min={0}
          max={23}
        />
      </div>
    </div>
  );
}
