'use client';

import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import styles from './calendar-sidebar.module.scss';

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  highlightedDates?: number[];
}

export default function CalendarSidebar({
  selectedDate,
  onDateChange,
  highlightedDates = [],
}: CalendarSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.calendarWrapper}>
        <DatePicker
          value={selectedDate}
          onChange={onDateChange}
          locale="ru"
          minDate={null}
          className={styles.calendar}
        />
      </div>
      <div className={styles.createBtnWrapper}>
        <Button
          text="Создать публикацию"
          showArrow={false}
          active
          fullWidth
          className={styles.createBtn}
          onClick={() => { window.location.href = '/create-post'; }}
        />
      </div>
    </div>
  );
}
