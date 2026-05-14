'use client';

import { useState } from 'react';
import DatePicker from '@/components/date-picker/date-picker';
import Checkbox from '@/components/checkbox/checkbox';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CalendarDraftIcon, WalletAdIcon } from '@/components/icons';
import type { Draft } from '@/types/post';
import { getPreviewText, getSourceDate } from '@/[locale]/calendar/utils/calendar-helpers';
import { useDayBatchQuery, useDayCountsQuery, useDraftsListQuery } from '../store/queries';
import styles from './PostSourcePanel.module.scss';

type Source = 'ads' | 'calendar' | 'drafts';
type StatusFilter = 'all' | 'scheduled' | 'published';

const SOURCE_OPTIONS: { id: Source; label: string }[] = [
  { id: 'ads', label: 'Рекламные посты' },
  { id: 'calendar', label: 'Календарь публикаций' },
  { id: 'drafts', label: 'Черновики' },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'scheduled', label: 'Запланированные' },
  { id: 'published', label: 'Опубликованные' },
];

const RU_WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const RU_MONTHS_GEN = [
  'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря',
];

interface PostSourcePanelProps {
  onClose: () => void;
  onSelect: (draft: Draft) => void;
}

export default function PostSourcePanel({ onClose, onSelect }: PostSourcePanelProps) {
  const [source, setSource] = useState<Source>('ads');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pickedDate, setPickedDate] = useState<Date>(todayMidnight);
  const [monthStart, setMonthStart] = useState<Date>(() => firstOfMonth(todayMidnight()));

  const dayCounts = useDayCountsQuery(monthStart);
  const dayBatch = useDayBatchQuery(source === 'drafts' ? null : pickedDate, {
    isAd: source === 'ads',
  });
  const drafts = useDraftsListQuery();

  const isDrafts = source === 'drafts';
  const draftsByDay = isDrafts ? groupDraftsByDay(drafts.data ?? []) : {};

  const indicatorCounts = source === 'ads' ? undefined : pickSourceCounts(source, dayCounts.data, draftsByDay);
  const adsCounts = source === 'ads' ? dayCounts.data?.ads : undefined;
  const rawDayItems = isDrafts
    ? draftsByDay[dateKey(pickedDate)] ?? []
    : dayBatch.data ?? [];
  const dayItems = applyStatusFilter(rawDayItems, statusFilter);
  const loading = isDrafts ? drafts.isLoading : dayBatch.isLoading;
  const showStatusFilter = source !== 'drafts';

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Выберите источник поста</h3>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          <ChevronDownIcon width={16} height={16} color="#383F45" />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.sourcesList}>
          {SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={styles.sourceRow}
              onClick={(e) => {
                e.preventDefault();
                setSource(opt.id);
              }}
            >
              <Checkbox
                variant="radio"
                checked={source === opt.id}
                onChange={() => setSource(opt.id)}
              />
              <span className={styles.sourceLabel}>{opt.label}</span>
            </label>
          ))}
        </div>

        {showStatusFilter && (
          <div className={styles.statusFilter}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.statusChip} ${statusFilter === opt.id ? styles.statusChipActive : ''}`}
                onClick={() => setStatusFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.calendarWrap}>
          <DatePicker
            value={pickedDate}
            onChange={setPickedDate}
            onMonthChange={(d) => setMonthStart(firstOfMonth(d))}
            locale="ru"
            minDate={null}
            postCounts={indicatorCounts}
            adsCounts={adsCounts}
          />
        </div>

        <div className={styles.dayHeader}>{formatDayHeader(pickedDate)}</div>

        <div className={styles.postsList}>
          {loading && (
            <div className={styles.loaderRow}>
              <Loader size={24} color="blue" />
            </div>
          )}
          {!loading && dayItems.length === 0 && (
            <div className={styles.empty}>{emptyText(source)}</div>
          )}
          {!loading &&
            dayItems
              .slice()
              .sort(byTimeAsc)
              .map((post) => (
                <PostRow key={post.id} post={post} source={source} onClick={() => onSelect(post)} />
              ))}
        </div>
      </div>
    </aside>
  );
}

// ----------------------------------------------------------------
// Row component
// ----------------------------------------------------------------

interface PostRowProps {
  post: Draft;
  source: Source;
  onClick: () => void;
}

function PostRow({ post, source, onClick }: PostRowProps) {
  const date = getItemDate(post);
  const preview = getPreviewText(post) || '(без текста)';
  return (
    <button type="button" className={styles.postRow} onClick={onClick}>
      <SourceIcon source={source} post={post} />
      {date && <span className={styles.postTime}>{formatTime(date)}</span>}
      <span className={styles.postPreview}>{preview.slice(0, 60)}</span>
    </button>
  );
}

function SourceIcon({ source, post }: { source: Source; post: Draft }) {
  if (source === 'ads' || post.is_ad) return <WalletAdIcon width={16} height={16} />;
  if (source === 'drafts') return <CalendarDraftIcon width={14} height={14} />;
  return <CalendarDocPostIcon width={16} height={16} />;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getItemDate(item: Draft): Date | null {
  const iso = getSourceDate(item);
  return iso ? new Date(iso) : null;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatDayHeader(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS_GEN[d.getMonth()]}, ${RU_WEEKDAYS[d.getDay()]}`;
}

function emptyText(source: Source): string {
  if (source === 'drafts') return 'Черновиков на эту дату нет';
  if (source === 'ads') return 'Рекламных постов на эту дату нет';
  return 'Постов на эту дату нет';
}

function groupDraftsByDay(drafts: Draft[]): Record<string, Draft[]> {
  const result: Record<string, Draft[]> = {};
  for (const d of drafts) {
    const date = getItemDate(d);
    if (!date) continue;
    const key = dateKey(date);
    (result[key] ||= []).push(d);
  }
  return result;
}

function countMap(byDay: Record<string, Draft[]>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, list] of Object.entries(byDay)) result[key] = list.length;
  return result;
}

function pickSourceCounts(
  source: Source,
  dayCounts: { total: Record<string, number>; ads: Record<string, number> } | undefined,
  draftsByDay: Record<string, Draft[]>,
): Record<string, number> {
  if (source === 'drafts') return countMap(draftsByDay);
  if (source === 'ads') return dayCounts?.ads ?? {};
  return dayCounts?.total ?? {};
}

function byTimeAsc(a: Draft, b: Draft): number {
  return (getItemDate(a)?.getTime() ?? 0) - (getItemDate(b)?.getTime() ?? 0);
}

function applyStatusFilter(items: Draft[], filter: StatusFilter): Draft[] {
  if (filter === 'all') return items;
  if (filter === 'scheduled') return items.filter((p) => p.status === 'scheduled');
  return items.filter((p) => p.status === 'published' || p.status === 'partial_success');
}
