'use client';

import type { RefObject } from 'react';
import styles from '../edit-post.module.scss';
import { CalendarIcon } from '@/components/icons';
import DatePicker from '@/components/date-picker/date-picker';
import { TimePicker } from '@/components/time-picker';
import type { QuickTime } from '@/components/time-picker';
import { formatDateDisplay, formatTimeDisplay } from '../utils/formatters';

interface DateTimeInputsProps {
  scheduledDate: Date | null;
  hours: number;
  minutes: number;
  showDatePicker: boolean;
  showTimePicker: boolean;
  onToggleDatePicker: () => void;
  onToggleTimePicker: () => void;
  onDateChange: (date: Date) => void;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
  datePickerRef: RefObject<HTMLDivElement | null>;
  timePickerRef: RefObject<HTMLDivElement | null>;
  recentTimes?: QuickTime[];
}

export default function DateTimeInputs({
  scheduledDate,
  hours,
  minutes,
  showDatePicker,
  showTimePicker,
  onToggleDatePicker,
  onToggleTimePicker,
  onDateChange,
  onHoursChange,
  onMinutesChange,
  datePickerRef,
  timePickerRef,
  recentTimes,
}: DateTimeInputsProps) {
  return (
    <div className={styles.dateTimeRow}>
      <div className={styles.dateInputWrapper} ref={datePickerRef}>
        <div className={styles.dateInput} onClick={onToggleDatePicker}>
          <CalendarIcon width={18} height={18} color="#3B82F6" />
          <span className={styles.dateInputText}>
            {formatDateDisplay(scheduledDate) || 'Выберите дату'}
          </span>
        </div>
        {showDatePicker && (
          <div className={styles.datePickerDropdown}>
            <DatePicker
              value={scheduledDate ?? undefined}
              onChange={(date) => onDateChange(date)}
              locale="ru"
              selectedDates={scheduledDate ? [scheduledDate.getDate()] : []}
            />
          </div>
        )}
      </div>

      <div className={styles.timeInputWrapper} ref={timePickerRef}>
        <div className={styles.timeInput} onClick={onToggleTimePicker}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18.5a8.5 8.5 0 110-17 8.5 8.5 0 010 17zm.75-8.69V7.5a.75.75 0 00-1.5 0v4.69l-2.72 2.72a.75.75 0 001.06 1.06l2.91-2.91a.75.75 0 00.25-.56z" fill="#3B82F6"/>
          </svg>
          <span className={styles.timeInputText}>{formatTimeDisplay(hours, minutes)}</span>
        </div>
        {showTimePicker && (
          <div className={styles.timePickerDropdown}>
            <TimePicker
              hours={hours}
              minutes={minutes}
              onHoursChange={onHoursChange}
              onMinutesChange={onMinutesChange}
              selectedDate={scheduledDate}
              quickTimes={recentTimes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
