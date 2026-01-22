'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';
import TimePicker from '@/components/time-picker/time-picker';

type PublishTimeType = 'from_publish' | 'exact_time';

interface PublishTimeSelectorProps {
  value: PublishTimeType;
  onChange: (value: PublishTimeType) => void;
  hours: number;
  minutes: number;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
}

export default function PublishTimeSelector({ 
  value, 
  onChange,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: PublishTimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayText = value === 'from_publish' ? 'С момента публ.' : 'Точное время';

  return (
    <div className={styles.publishTimeWrapper}>
      <button
        type="button"
        className={styles.repeatDailyRow}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.repeatDailyRowLabel}>Опубликовать в</span>
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
              checked={value === 'from_publish'}
              onChange={() => {
                onChange('from_publish');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>С момента публикации</span>
          </div>
          <div className={styles.publishTimeOption}>
            <Checkbox
              variant="radio"
              checked={value === 'exact_time'}
              onChange={() => {
                onChange('exact_time');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>Точное время</span>
          </div>
        </div>
      )}

      {value === 'exact_time' && !isOpen && (
        <div className={styles.timePickerContainer}>
          <TimePicker
            hours={hours}
            minutes={minutes}
            onHoursChange={onHoursChange}
            onMinutesChange={onMinutesChange}
          />
        </div>
      )}
    </div>
  );
}
