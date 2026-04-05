'use client';

import DatePicker from './date-picker';
import { TimePicker, useRecentTimes } from '../time-picker';
import styles from './date-picker-modal.module.scss';
import Button from '../button/button';
import type { DatePickerModalProps } from '@/types/post';

export default function DatePickerModal({
  isOpen,
  selectedDate,
  hours,
  minutes,
  onDateChange,
  onHoursChange,
  onMinutesChange,
  onSchedule,
  onClose,
  isLoading = false,
}: DatePickerModalProps) {
  const recentTimes = useRecentTimes();

  const handleSchedule = async () => {
    if (!selectedDate) return;
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    await onSchedule(scheduledDateTime);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.datePickerModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>Расписание публикации</div>
        <div className={styles.pickersWrapper}>
          <DatePicker
            value={selectedDate ?? undefined}
            onChange={onDateChange}
            locale="ru"
            selectedDates={selectedDate ? [selectedDate.getDate()] : []}
          />
          <TimePicker
            hours={hours}
            minutes={minutes}
            onHoursChange={onHoursChange}
            onMinutesChange={onMinutesChange}
            selectedDate={selectedDate}
            quickTimes={recentTimes}
          />
        </div>
        <div className={styles.buttonWrapper}>
          <Button
            text="Запланировать"
            onClick={handleSchedule}
            disabled={!selectedDate || isLoading}
            loading={isLoading}
            showArrow={false}
            fullWidth={true}
            active={true}
          />
        </div>
      </div>
    </div>
  );
}
