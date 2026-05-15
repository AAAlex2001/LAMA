'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { ChevronDownIcon } from '@/components/icons';
import styles from './date-picker.module.scss';
import 'react-calendar/dist/Calendar.css';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  locale?: string;
  className?: string;
  selectedDates?: number[];
  disableNavigation?: boolean;
  minDate?: Date | null;
  highlightWeek?: boolean;
  postCounts?: Record<string, number>;
  adsCounts?: Record<string, number>;
  selectedDateKeys?: string[];
  rangeSelection?: boolean;
}

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({
  value,
  onChange,
  onMonthChange,
  locale = 'ru',
  className,
  selectedDates = [],
  disableNavigation = false,
  minDate,
  highlightWeek = false,
  postCounts,
  adsCounts,
  selectedDateKeys = [],
  rangeSelection = false,
}: DatePickerProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const [selectedDate, setSelectedDate] = useState<Date>(value || now);
  const [activeStartDate, setActiveStartDate] = useState<Date>(value || now);

  useEffect(() => {
    if (value) {
      setSelectedDate((prev) => {
        if (prev.getTime() === value.getTime()) return prev;
        return value;
      });
      // Only reset visible month when the selected date actually changes
      // (prevents month navigation from being overridden by re-renders)
      setActiveStartDate((prev) => {
        if (value.getFullYear() === prev.getFullYear() && value.getMonth() === prev.getMonth()) return prev;
        return new Date(value.getFullYear(), value.getMonth(), 1);
      });
    }
  }, [value?.getTime()]);

  const handleDateChange = (newValue: Date | Date[] | [Date | null, Date | null] | null) => {
    if (newValue instanceof Date) {
      setSelectedDate(newValue);
      onChange?.(newValue);
    }
  };

  const getTileClassName = (date: Date) => {
    const classes: string[] = [];

    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hasDateKeys = selectedDateKeys.length > 0;
    const rangeStartKey = hasDateKeys ? selectedDateKeys[0] : null;
    const rangeEndKey = hasDateKeys ? selectedDateKeys[selectedDateKeys.length - 1] : null;

    if (hasDateKeys && selectedDateKeys.includes(dateKey)) {
      if (rangeSelection) {
        classes.push('react-calendar__tile--range');
        if (dateKey === rangeStartKey) classes.push('react-calendar__tile--range-start');
        if (dateKey === rangeEndKey) classes.push('react-calendar__tile--range-end');
        if (dateKey !== rangeStartKey && dateKey !== rangeEndKey) classes.push('react-calendar__tile--range-middle');
      } else {
        classes.push('react-calendar__tile--selected');
      }
    }

    if (selectedDates && selectedDates.length > 0 && selectedDates.includes(date.getDate())) {
      classes.push('react-calendar__tile--selected');
    }

    if (highlightWeek && selectedDate) {
      const weekStart = getWeekStartDate(selectedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const ws = new Date(weekStart);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(weekEnd);
      we.setHours(0, 0, 0, 0);

      if (checkDate >= ws && checkDate <= we) {
        classes.push('react-calendar__tile--week-highlight');
        if (isSameDay(checkDate, ws)) classes.push('react-calendar__tile--week-start');
        if (isSameDay(checkDate, we)) classes.push('react-calendar__tile--week-end');
      }
    }

    return classes.join(' ');
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
    <div className={`${styles.datePicker} ${rangeSelection ? styles.rangeMode : ''} ${highlightWeek ? styles.weekMode : ''} ${className || ''}`}>
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={({ activeStartDate: newDate }) => {
          if (newDate) {
            setActiveStartDate(newDate);
            onMonthChange?.(newDate);
          }
        }}
        locale={locale}
        minDate={minDate === null ? undefined : (minDate ?? today)}
        tileClassName={({ date }) => getTileClassName(date)}
        tileContent={({ date }) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${d}`;
          const totalCount = postCounts?.[key] ?? 0;
          const adsCount = adsCounts?.[key] ?? 0;
          if (!totalCount && !adsCount) return null;
          // Делим единую полоску max 21px на синюю слева (обычные посты)
          // и оранжевую справа (рекламные). Полоска одна, на одной линии.
          const unit = 21 / 5;
          const nonAdsCount = Math.max(0, totalCount - adsCount);
          const blueWidth = Math.max(1, Math.min(5, nonAdsCount)) * unit;
          const orangeWidth = Math.max(1, Math.min(5, adsCount)) * unit;
          const isSelected = isSameDay(date, selectedDate);
          return (
            <span className={styles.indicatorRow}>
              {nonAdsCount > 0 && (
                <span
                  className={`${styles.postIndicator} ${isSelected ? styles.postIndicatorActive : ''}`}
                  style={{ width: `${blueWidth}px` }}
                />
              )}
              {adsCount > 0 && (
                <span
                  className={`${styles.adsIndicator} ${isSelected ? styles.adsIndicatorActive : ''}`}
                  style={{ width: `${orangeWidth}px` }}
                />
              )}
            </span>
          );
        }}
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
            <ChevronDownIcon width={20} height={20} color="#000000" />
          </div>
        )}
        nextLabel={disableNavigation ? null : (
          <div className={styles.chevron}>
            <ChevronDownIcon width={20} height={20} color="#000000" />
          </div>
        )}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
      />
    </div>
  );
}
