'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import styles from './date-picker.module.scss';
import 'react-calendar/dist/Calendar.css';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  locale?: string;
  className?: string;
  selectedDates?: number[];
  disableNavigation?: boolean;
}

export default function DatePicker({ 
  value, 
  onChange, 
  locale = 'ru',
  className,
  selectedDates = [],
  disableNavigation = false
}: DatePickerProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const [selectedDate, setSelectedDate] = useState<Date>(value || now);
  const [activeStartDate, setActiveStartDate] = useState<Date>(value || now);

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setActiveStartDate(value);
    }
  }, [value]);

  const handleDateChange = (newValue: any) => {
    if (newValue instanceof Date) {
      setSelectedDate(newValue);
      onChange?.(newValue);
    }
  };

  const getTileClassName = (date: Date) => {
    if (selectedDates && selectedDates.length > 0 && selectedDates.includes(date.getDate())) {
      return 'react-calendar__tile--selected';
    }
    return '';
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
        activeStartDate={activeStartDate}
        onActiveStartDateChange={({ activeStartDate: newDate }) => {
          if (newDate) setActiveStartDate(newDate);
        }}
        locale={locale}
        minDate={today}
        tileClassName={({ date }) => getTileClassName(date)}
        formatShortWeekday={(locale, date) => {
          const dayIndex = (date.getDay() + 6) % 7;
          return getWeekDay(locale || 'ru', dayIndex);
        }}
        formatMonthYear={(locale, date) => {
          const monthIndex = date.getMonth();
          const year = date.getFullYear();
          return getMonthName(locale || 'ru', monthIndex, year);
        }}
        prevLabel={disableNavigation ? null : (
          <div className={styles.chevron}>
            <ChevronDownIcon width={20} height={20} color="#383F45" />
          </div>
        )}
        nextLabel={disableNavigation ? null : (
          <div className={styles.chevron}>
            <ChevronDownIcon width={20} height={20} color="#383F45" />
          </div>
        )}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
      />
    </div>
  );
}
