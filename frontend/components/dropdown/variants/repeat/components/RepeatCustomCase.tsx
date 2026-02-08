'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../repeat.module.scss';
import IntervalSelector, { type IntervalType } from './IntervalSelector';
import IntervalValuePicker from './IntervalValuePicker';
import WeekdaySelector from './WeekdaySelector';
import MonthSelector from './MonthSelector';
import MonthDatePicker from '@/components/month-date-picker';
import { DatePicker } from '@/components/date-picker';
import Toggle from '@/components/toggle/toggle';
import RepeatEndSelector from './RepeatEndSelector';
import { ChevronDownIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import type { RepeatOption } from '../../../types';

interface RepeatCustomCaseProps {
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: IntervalType;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
  onRepeatCustomUnitChange?: (value: IntervalType) => void;
  onRepeatCustomValueChange?: (value: number) => void;
  onRepeatWeekdaysChange?: (value: number[]) => void;
  onRepeatMonthDaysChange?: (value: number[]) => void;
  onRepeatYearMonthChange?: (value: number) => void;
  onRepeatYearDaysChange?: (value: number[]) => void;
  repeatEndType: 'never' | 'date';
  repeatEndDate: Date | null;
  onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
  onRepeatEndDateChange?: (value: Date | null) => void;
  onRepeatOptionChange?: (value: RepeatOption) => void;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export default function RepeatCustomCase({
  repeatCustomDays,
  repeatCustomHours,
  repeatCustomUnit,
  repeatCustomValue,
  repeatWeekdays,
  repeatMonthDays,
  repeatYearMonth,
  repeatYearDays,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  onRepeatCustomUnitChange,
  onRepeatCustomValueChange,
  onRepeatWeekdaysChange,
  onRepeatMonthDaysChange,
  onRepeatYearMonthChange,
  onRepeatYearDaysChange,
  repeatEndType,
  repeatEndDate,
  onRepeatEndTypeChange,
  onRepeatEndDateChange,
  onRepeatOptionChange,
}: RepeatCustomCaseProps) {
  const [intervalType, setIntervalType] = useState<IntervalType>(repeatCustomUnit || 'days');
  const [intervalValue, setIntervalValue] = useState(() => (repeatCustomValue > 0 ? repeatCustomValue : 1));
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(repeatWeekdays || []);
  const [selectedMonthDates, setSelectedMonthDates] = useState<number[]>(repeatMonthDays?.length ? repeatMonthDays : [new Date().getDate()]);
  const [selectedYearMonth, setSelectedYearMonth] = useState(repeatYearMonth ?? new Date().getMonth());
  const [showYearDays, setShowYearDays] = useState(false);
  const [selectedYearDates, setSelectedYearDates] = useState<number[]>(repeatYearDays?.length ? repeatYearDays : [new Date().getDate()]);
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLButtonElement>(null);

  const FREQUENCY_OPTIONS: { id: RepeatOption; label: string }[] = [
    { id: 'never', label: 'Никогда' },
    { id: 'daily', label: 'Каждый день' },
    { id: 'weekly', label: 'Каждую неделю' },
    { id: 'monthly', label: 'Каждый месяц' },
    { id: 'yearly', label: 'Каждый год' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        selectorRef.current && !selectorRef.current.contains(e.target as Node)
      ) {
        setShowFrequencyPopup(false);
      }
    };
    if (showFrequencyPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFrequencyPopup]);

  const updateCustomInterval = (type: IntervalType, value: number) => {
    const normalizedValue = Math.max(1, value);
    let customDays = 0;

    switch (type) {
      case 'days':
        customDays = normalizedValue;
        break;
      case 'weeks':
        customDays = normalizedValue * 7;
        break;
      case 'months':
        customDays = normalizedValue * 30;
        break;
      case 'years':
        customDays = normalizedValue * 365;
        break;
      default:
        customDays = normalizedValue;
    }

    onRepeatCustomUnitChange?.(type);
    onRepeatCustomValueChange?.(normalizedValue);
    onRepeatCustomDaysChange?.(customDays);
    if (repeatCustomHours !== 0) {
      onRepeatCustomHoursChange?.(0);
    }
  };

  const handleIntervalTypeChange = (type: IntervalType) => {
    setIntervalType(type);
    updateCustomInterval(type, intervalValue);
  };

  const handleIntervalValueChange = (value: number) => {
    setIntervalValue(value);
    updateCustomInterval(intervalType, value);
  };

  useEffect(() => {
    const now = new Date();
    const newDate = new Date(now.getFullYear(), selectedYearMonth, 1);
    // Update selected dates when month changes
  }, [selectedYearMonth]);

  const getIntervalLabel = (type: IntervalType, value: number): string => {
    switch (type) {
      case 'days':
        return pluralize(value, 'день', 'дня', 'дней');
      case 'weeks':
        return pluralize(value, 'неделю', 'недели', 'недель');
      case 'months':
        return pluralize(value, 'месяц', 'месяца', 'месяцев');
      case 'years':
        return pluralize(value, 'год', 'года', 'лет');
    }
  };

  const getEveryLabel = (type: IntervalType, value: number): string => {
    if (value === 1) {
      if (type === 'weeks') return 'Каждую';
      return 'Каждый';
    }
    return 'Каждые';
  };

  const getDescriptionText = (): string => {
    if (intervalType === 'days') {
      if (intervalValue === 1) {
        return 'каждый день';
      }
      return `каждые ${intervalValue} дня${intervalValue % 10 === 1 && intervalValue % 100 !== 11 ? '' : intervalValue % 10 >= 2 && intervalValue % 10 <= 4 && (intervalValue % 100 < 10 || intervalValue % 100 >= 20) ? '' : 's'} (раз в ${intervalValue} дня${intervalValue % 10 === 1 && intervalValue % 100 !== 11 ? '' : intervalValue % 10 >= 2 && intervalValue % 10 <= 4 && (intervalValue % 100 < 10 || intervalValue % 100 >= 20) ? '' : 's'})`;
    }
    return '';
  };

  const formatDaysDescription = (days: number): string => {
    const mod10 = days % 10;
    const mod100 = days % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${days} дней`;
    if (mod10 === 1) return `${days} день`;
    if (mod10 >= 2 && mod10 <= 4) return `${days} дня`;
    return `${days} дней`;
  };

  const getWeekdayName = (dayIndex: number): string => {
    const days: Record<number, string> = {
      1: 'понедельник',
      2: 'вторник',
      3: 'среда',
      4: 'четверг',
      5: 'пятница',
      6: 'суббота',
      0: 'воскресенье',
    };
    return days[dayIndex] || '';
  };

  const formatWeeksDescription = (): string => {
    const base = intervalValue === 1 ? 'Каждую неделю' : `Каждую ${intervalValue} неделю`;
    if (selectedWeekdays.length === 0) return base;

    const dayNames = selectedWeekdays.map(day => getWeekdayName(day)).join(', ');
    return `${base} в ${dayNames}`;
  };

  const formatMonthsDescription = (): string => {
    if (selectedMonthDates.length === 0) return '';
    
    const days = [...selectedMonthDates].sort((a, b) => a - b).join(', ');
    
    if (intervalValue === 1) {
      return `Каждый месяц ${days} числа`;
    }
    
    const mod10 = intervalValue % 10;
    const mod100 = intervalValue % 100;
    let monthWord = 'месяцев';
    if (mod100 >= 11 && mod100 <= 19) monthWord = 'месяцев';
    else if (mod10 === 1) monthWord = 'месяц';
    else if (mod10 >= 2 && mod10 <= 4) monthWord = 'месяца';
    
    return `Каждые ${intervalValue} ${monthWord} ${days} числа`;
  };

  const toggleMonthDate = (date: number | Date) => {
    const day = typeof date === 'number' ? date : date.getDate();
    const next = selectedMonthDates.includes(day)
      ? selectedMonthDates.filter(d => d !== day)
      : [...selectedMonthDates, day];
    setSelectedMonthDates(next);
    onRepeatMonthDaysChange?.(next);
  };

  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  const formatYearsDescription = (): string => {
    if (selectedYearDates.length === 0) return '';
    
    const days = [...selectedYearDates].sort((a, b) => a - b).join(', ');
    const monthName = monthNames[selectedYearMonth];
    
    if (intervalValue === 1) {
      return `Каждый год ${days} ${monthName}`;
    }
    
    const mod10 = intervalValue % 10;
    const mod100 = intervalValue % 100;
    let yearWord = 'лет';
    if (mod100 >= 11 && mod100 <= 19) yearWord = 'лет';
    else if (mod10 === 1) yearWord = 'год';
    else if (mod10 >= 2 && mod10 <= 4) yearWord = 'года';
    
    return `Каждые ${intervalValue} ${yearWord} ${days} ${monthName}`;
  };

  const toggleYearDate = (date: Date) => {
    const day = date.getDate();
    const next = selectedYearDates.includes(day)
      ? selectedYearDates.filter(d => d !== day)
      : [...selectedYearDates, day];
    setSelectedYearDates(next);
    onRepeatYearDaysChange?.(next);
  };

  return (
    <div className={styles.repeatDaily}>
      <div className={styles.repeatDailyTopRow}>
        <button
          type="button"
          ref={selectorRef}
          className={styles.repeatDailySelector}
          onClick={() => setShowFrequencyPopup(prev => !prev)}
        >
          <span className={styles.repeatDailySelectorText}>Настройка повтора</span>
          <ChevronDownIcon
            width={14}
            height={14}
            color="#858585"
            className={`${styles.frequencyChevron} ${showFrequencyPopup ? styles.frequencyChevronRotated : ''}`}
          />
        </button>
      </div>

      {showFrequencyPopup && (
        <div ref={popupRef} className={styles.frequencyPopup}>
          {FREQUENCY_OPTIONS.map((option) => (
            <div key={option.id} className={styles.frequencyPopupRow}>
              <Checkbox
                variant="radio"
                checked={false}
                onChange={() => {
                  onRepeatOptionChange?.(option.id);
                  setShowFrequencyPopup(false);
                }}
              />
              <span className={styles.optionLabel}>{option.label}</span>
            </div>
          ))}
        </div>
      )}

      {intervalType === 'days' && (
        <div className={styles.repeatDescription}>
          {formatDaysDescription(intervalValue) === '1 день' ? 'каждый день' : `каждые ${formatDaysDescription(intervalValue).toLowerCase()}`}
        </div>
      )}

      {intervalType === 'weeks' && (
        <div className={styles.repeatDescription}>
          {formatWeeksDescription()}
        </div>
      )}

      {intervalType === 'months' && (
        <div className={styles.repeatDescription}>
          {formatMonthsDescription()}
        </div>
      )}

      {intervalType === 'years' && selectedYearDates.length > 0 && (
        <div className={styles.repeatDescription}>
          {formatYearsDescription()}
        </div>
      )}

      <IntervalSelector
        value={intervalType}
        onChange={handleIntervalTypeChange}
      />

      <div className={styles.repeatCustomIntervalRow}>
        <span className={styles.repeatCustomIntervalText}>{getEveryLabel(intervalType, intervalValue)}</span>
        <span className={styles.repeatCustomIntervalValueActive}>
          {getIntervalLabel(intervalType, intervalValue)}
        </span>
      </div>

      <IntervalValuePicker
        value={intervalValue}
        onChange={handleIntervalValueChange}
        label={getIntervalLabel(intervalType, intervalValue)}
      />

      {intervalType === 'weeks' && (
        <WeekdaySelector
          selectedDays={selectedWeekdays}
          onChange={(days) => {
            setSelectedWeekdays(days);
            onRepeatWeekdaysChange?.(days);
          }}
        />
      )}

      {intervalType === 'months' && (
        <MonthDatePicker
          selectedDates={selectedMonthDates}
          onChange={toggleMonthDate}
        />
      )}

      {intervalType === 'years' && (
        <>
          <MonthSelector
            selectedMonth={selectedYearMonth}
            onChange={(month) => {
              setSelectedYearMonth(month);
              onRepeatYearMonthChange?.(month);
            }}
          />
          <div className={styles.yearDaysToggle}>
            <span className={styles.yearDaysLabel}>Дни недели</span>
            <Toggle checked={showYearDays} onChange={setShowYearDays} />
          </div>
          {showYearDays && (
            <div className={styles.yearDatePicker}>
              <DatePicker
                value={selectedYearDates.length > 0 ? new Date(new Date().getFullYear(), selectedYearMonth, selectedYearDates[0]) : undefined}
                onChange={toggleYearDate}
                selectedDates={selectedYearDates}
                disableNavigation={true}
                minDate={null}
              />
            </div>
          )}
        </>
      )}

      <RepeatEndSelector
        value={repeatEndType}
        onChange={(value) => {
          console.log('RepeatEndSelector onChange:', value);
          onRepeatEndTypeChange?.(value);
        }}
        endDate={repeatEndDate}
        onEndDateChange={(date) => {
          console.log('RepeatEndSelector onEndDateChange:', date);
          onRepeatEndDateChange?.(date);
        }}
      />
    </div>
  );
}
