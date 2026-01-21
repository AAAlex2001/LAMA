'use client';

import DatePicker from './date-picker';
import { TimePicker } from '../time-picker';
import styles from './date-picker-modal.module.scss';
import { useDatePicker } from './DatePickerContext';
import Button from '../button/button';

export default function DatePickerModal() {
  const { isOpen, selectedDate, setSelectedDate, hours, minutes, setHours, setMinutes, schedulePost, close } = useDatePicker();

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClose = () => {
    close();
  };

  const handleSchedule = () => {
    schedulePost();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.datePickerModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <DatePicker 
          value={selectedDate || undefined}
          onChange={handleDateChange}
          locale="ru"
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
