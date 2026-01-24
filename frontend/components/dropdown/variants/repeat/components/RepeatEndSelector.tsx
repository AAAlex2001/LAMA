'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';
import DatePicker from '@/components/date-picker/date-picker';

type RepeatEndType = 'never' | 'date';

interface RepeatEndSelectorProps {
  value: RepeatEndType;
  onChange: (value: RepeatEndType) => void;
  endDate: Date | null;
  onEndDateChange: (date: Date) => void;
}

export default function RepeatEndSelector({ 
  value, 
  onChange,
  endDate,
  onEndDateChange,
}: RepeatEndSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayText = value === 'never' ? 'Никогда' : 'В дату';

  return (
    <div className={styles.repeatEndWrapper}>
      <button
        type="button"
        className={styles.repeatDailyRow}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.repeatDailyRowLabel}>Конец повтора</span>
        <div className={styles.repeatDailyRowValue}>
          <span className={styles.repeatDailyRowValueText}>{displayText}</span>
          <ChevronDownIcon width={14} height={14} color="#858585" />
        </div>
      </button>

      {isOpen && (
        <div className={styles.repeatEndDropdown}>
          <div className={styles.repeatEndOption}>
            <Checkbox
              variant="radio"
              checked={value === 'never'}
              onChange={() => {
                onChange('never');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>Никогда</span>
          </div>
          <div className={styles.repeatEndOption}>
            <Checkbox
              variant="radio"
              checked={value === 'date'}
              onChange={() => {
                onChange('date');
                setIsOpen(false);
              }}
            />
            <span className={styles.optionLabel}>В дату</span>
          </div>
        </div>
      )}

      {value === 'date' && !isOpen && (
        <div className={styles.datePickerContainer}>
          <DatePicker
            value={endDate || undefined}
            onChange={onEndDateChange}
            selectedDates={endDate ? [endDate.getDate()] : []}
          />
        </div>
      )}
    </div>
  );
}
