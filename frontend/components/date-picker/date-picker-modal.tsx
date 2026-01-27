'use client';

import DatePicker from './date-picker';
import { TimePicker } from '../time-picker';
import styles from './date-picker-modal.module.scss';
import { useDatePicker } from './DatePickerContext';
import Button from '../button/button';

interface DatePickerModalProps {
  onSchedule?: (scheduledDate: Date) => void | Promise<void>;
}

export default function DatePickerModal({ onSchedule }: DatePickerModalProps) {
  const { isOpen, selectedDate, setSelectedDate, hours, minutes, setHours, setMinutes, close } = useDatePicker();

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClose = () => {
    close();
  };

  const handleSchedule = async () => {
    if (!selectedDate) return;
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    setSelectedDate(scheduledDateTime);
    if (onSchedule) {
      await onSchedule(scheduledDateTime);
    }
    close();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.datePickerModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <DatePicker 
          value={selectedDate || undefined}
          onChange={handleDateChange}
          locale="ru"
          selectedDates={selectedDate ? [selectedDate.getDate()] : []}
        />
        <TimePicker
          hours={hours}
          minutes={minutes}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          selectedDate={selectedDate}
        />
        <div className={styles.buttonWrapper}>
          <Button 
            text="Запланировать" 
            onClick={handleSchedule}
            disabled={!selectedDate}
            showArrow={false}
            fullWidth={true}
            active={true}
          />
        </div>
      </div>
    </div>
  );
}
