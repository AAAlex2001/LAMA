'use client';

import React from 'react';
import { CalendarArrowIcon, FilterSortIcon } from '@/components/icons';
import DatePicker from '@/components/date-picker/date-picker';
import ListDateRangePicker from './ListDateRangePicker';
import type { CalendarView } from '../store';
import styles from './calendar-header.module.scss';

interface CalendarHeaderProps {
  selectedDate: Date;
  currentView: CalendarView;
  listRange: { start: Date; end: Date } | null;
  onListRangeChange: (range: { start: Date; end: Date } | null) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onViewChange: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  gridPostCounts?: Record<string, number>;
  listSortOrder: 'asc' | 'desc' | null;
  onListSortChange: (order: 'asc' | 'desc' | null) => void;
}

const MONTH_NAMES_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

function formatShortDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_RU[date.getMonth()];
  return `${day} ${month}`;
}

function formatWeekRange(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = MONTH_NAMES_RU[monday.getMonth()];
  const endMonth = MONTH_NAMES_RU[sunday.getMonth()];

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

function formatMonthTitle(date: Date): string {
  return `${MONTH_NAMES_RU[date.getMonth()]} ${date.getFullYear()}`;
}

function formatListTitle(date: Date): string {
  return String(date.getFullYear());
}

const VIEW_TABS: { key: CalendarView; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'list', label: 'Список' },
];

export default function CalendarHeader({
  selectedDate,
  currentView,
  listRange,
  onListRangeChange,
  onPrevDay,
  onNextDay,
  onViewChange,
  onDateChange,
  gridPostCounts,
  listSortOrder,
  onListSortChange,
}: CalendarHeaderProps) {
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [sortPopupOpen, setSortPopupOpen] = React.useState(false);
  const datePickerRef = React.useRef<HTMLDivElement>(null);
  const sortWrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!datePickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [datePickerOpen]);

  React.useEffect(() => {
    if (!sortPopupOpen) return;
    function handleClick(e: MouseEvent) {
      if (sortWrapperRef.current && !sortWrapperRef.current.contains(e.target as Node)) {
        setSortPopupOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortPopupOpen]);

  return (
    <div className={styles.header}>
      <div className={styles.tabsRow}>
        <div className={styles.viewTabs}>
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tab} ${currentView === tab.key ? styles.tabActive : ''}`}
              onClick={() => onViewChange(tab.key)}
            >
              <span className={styles.tabText}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sortWrapper} ref={sortWrapperRef}>
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={() => setSortPopupOpen((prev) => !prev)}
            aria-label="Сортировка"
          >
            <FilterSortIcon width={24} height={24} />
          </button>
          {sortPopupOpen && (
            <div className={styles.sortPopup}>
              <button
                type="button"
                className={styles.sortPopupItem}
                onClick={() => { onListSortChange('desc'); setSortPopupOpen(false); }}
              >
                <span className={listSortOrder !== 'asc' ? `${styles.sortRadio} ${styles.sortRadioActive}` : styles.sortRadio}>
                  <span className={styles.sortRadioDot} />
                </span>
                <span className={styles.sortPopupItemText}>Сначала новые</span>
              </button>
              <button
                type="button"
                className={styles.sortPopupItem}
                onClick={() => { onListSortChange('asc'); setSortPopupOpen(false); }}
              >
                <span className={listSortOrder === 'asc' ? `${styles.sortRadio} ${styles.sortRadioActive}` : styles.sortRadio}>
                  <span className={styles.sortRadioDot} />
                </span>
                <span className={styles.sortPopupItemText}>Сначала старые</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.slideButtons}>
        {currentView === 'list' ? (
          <div className={styles.listRangeWrap}>
            <ListDateRangePicker value={listRange} onChange={onListRangeChange} />
          </div>
        ) : (
          <div className={styles.slideRow}>
            <button
              type="button"
              className={styles.slideBtn}
              onClick={() => {
                if (currentView === 'day' || currentView === 'week') {
                  setDatePickerOpen((prev) => !prev);
                } else {
                  onPrevDay();
                }
              }}
            >
              <CalendarArrowIcon width={16} height={16} />
            </button>
            <button
              type="button"
              className={styles.dateTitleBtn}
              onClick={() => {
                if (currentView === 'day' || currentView === 'week') {
                  setDatePickerOpen((prev) => !prev);
                }
              }}
            >
              <span className={styles.dateTitle}>
                {currentView === 'week'
                  ? formatWeekRange(selectedDate)
                  : currentView === 'month'
                    ? formatMonthTitle(selectedDate)
                    : formatShortDate(selectedDate)}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.slideBtn} ${styles.slideBtnRight}`}
              onClick={() => {
                if (currentView === 'day' || currentView === 'week') {
                  setDatePickerOpen((prev) => !prev);
                } else {
                  onNextDay();
                }
              }}
            >
              <CalendarArrowIcon width={16} height={16} />
            </button>
          </div>
        )}

        {datePickerOpen && (currentView === 'day' || currentView === 'week') && (
          <div className={styles.datePickerPopup} ref={datePickerRef}>
            <DatePicker
              value={selectedDate}
              onChange={(date: Date) => {
                if (onDateChange) onDateChange(date);
                setDatePickerOpen(false);
              }}
              locale="ru"
              minDate={null}
              highlightWeek={currentView === 'week'}
              postCounts={gridPostCounts}
            />
          </div>
        )}
      </div>
    </div>
  );
}
