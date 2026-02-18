'use client';

import { SettingsIcon, CalendarArrowIcon } from '@/components/icons';
import type { CalendarView } from '../store';
import styles from './calendar-header.module.scss';

interface CalendarHeaderProps {
  selectedDate: Date;
  currentView: CalendarView;
  onPrevDay: () => void;
  onNextDay: () => void;
  onViewChange: (view: CalendarView) => void;
  onSettingsClick?: () => void;
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
  onPrevDay,
  onNextDay,
  onViewChange,
  onSettingsClick,
}: CalendarHeaderProps) {
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

        {onSettingsClick && (
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={onSettingsClick}
            aria-label="Настройки"
          >
            <SettingsIcon width={24} height={24} />
          </button>
        )}
      </div>

      <div className={styles.slideButtons}>
        <button type="button" className={styles.slideBtn} onClick={onPrevDay}>
          <CalendarArrowIcon width={16} height={16} />
        </button>
        <span className={styles.dateTitle}>
          {currentView === 'week'
            ? formatWeekRange(selectedDate)
            : currentView === 'month'
              ? formatMonthTitle(selectedDate)
              : currentView === 'list'
                ? formatListTitle(selectedDate)
                : formatShortDate(selectedDate)}
        </span>
        <button type="button" className={`${styles.slideBtn} ${styles.slideBtnRight}`} onClick={onNextDay}>
          <CalendarArrowIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
