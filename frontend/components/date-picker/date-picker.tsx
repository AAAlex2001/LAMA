'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import styles from './date-picker.module.scss';
import 'react-calendar/dist/Calendar.css';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  locale?: string;
  className?: string;
}

export default function DatePicker({ 
  value, 
  onChange, 
  locale = 'ru',
  className 
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      onChange?.(value);
    }
  };

  const monthNames: Record<string, string[]> = {
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sr: ['Јануар', 'Фебруар', 'Март', 'Април', 'Мај', 'Јун', 'Јул', 'Август', 'Септембар', 'Октобар', 'Новембар', 'Децембар']
  };

  const weekDayShort: Record<string, string[]> = {
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    sr: ['Пн', 'Ут', 'Ср', 'Чт', 'Пе', 'Су', 'Не']
  };

  const getWeekDay = (locale: string, dayIndex: number) => {
    return weekDayShort[locale]?.[dayIndex] || weekDayShort['ru'][dayIndex];
  };

  const getMonthName = (locale: string, monthIndex: number, year: number) => {
    return `${monthNames[locale]?.[monthIndex] || monthNames['ru'][monthIndex]} ${year}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={`${styles.datePicker} ${className || ''}`}>
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        locale={locale}
        minDate={today}
        formatShortWeekday={(locale, date) => {
          const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
          return getWeekDay(locale || 'ru', dayIndex);
        }}
        formatMonthYear={(locale, date) => {
          const monthIndex = date.getMonth();
          const year = date.getFullYear();
          return getMonthName(locale || 'ru', monthIndex, year);
        }}
        prevLabel={
          <div className={styles.chevron}>
            <ChevronDownIcon width={20} height={20} color="#383F45" />
          </div>
        }
        nextLabel={
          <div className={styles.chevron}>
            <ChevronDownIcon width={20} height={20} color="#383F45" />
          </div>
        }
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
      />
    </div>
  );
}
