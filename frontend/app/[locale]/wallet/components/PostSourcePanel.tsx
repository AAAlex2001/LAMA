'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import DatePicker from '@/components/date-picker/date-picker';
import Checkbox from '@/components/checkbox/checkbox';
import { Button } from '@/components/new-button';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CloseIcon, SearchIcon, WalletAdIcon } from '@/components/icons';
import type { Draft } from '@/types/post';
import { getPreviewText, getSourceDate } from '@/[locale]/calendar/utils/calendar-helpers';
import { useDayBatchQuery, useDayCountsQuery, useDraftsListQuery } from '../store/queries';
import styles from './PostSourcePanel.module.scss';

type Source = 'calendar' | 'drafts';
type StatusTab = 'all' | 'scheduled' | 'published';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
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
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'ru';

  const [source, setSource] = useState<Source>('calendar');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [pickedDate, setPickedDate] = useState<Date>(todayMidnight);
  const [monthStart, setMonthStart] = useState<Date>(() => firstOfMonth(todayMidnight()));

  const isCalendar = source === 'calendar';

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Выберите источник поста</h3>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          <CloseIcon width={16} height={16} color="#383F45" />
        </button>
      </div>

      <div className={styles.body}>
        <SourceRadio
          checked={isCalendar}
          label="Календарь публикаций"
          onSelect={() => setSource('calendar')}
        />

        {isCalendar && (
          <CalendarView
            pickedDate={pickedDate}
            onPickedDateChange={setPickedDate}
            monthStart={monthStart}
            onMonthStartChange={setMonthStart}
            statusTab={statusTab}
            onStatusTabChange={setStatusTab}
            onSelect={onSelect}
          />
        )}

        <SourceRadio
          checked={!isCalendar}
          label="Черновики"
          onSelect={() => setSource('drafts')}
        />

        {!isCalendar && <DraftsView onSelect={onSelect} />}
      </div>

      <Button
        variant="fill"
        intent="gradient"
        size="lg"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => router.push(`/${locale}/create-post?ad=1`)}
      >
        Создать рекламный пост
      </Button>
    </aside>
  );
}

// ──────────── Source radio (non-section-specific) ────────────

interface SourceRadioProps {
  checked: boolean;
  label: string;
  onSelect: () => void;
}

function SourceRadio({ checked, label, onSelect }: SourceRadioProps) {
  return (
    <label
      className={styles.sourceRow}
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <Checkbox variant="radio" checked={checked} onChange={onSelect} />
      <span className={styles.sourceLabel}>{label}</span>
    </label>
  );
}

// ──────────── Calendar view: date-picker + status tabs + ads badge + list ────────────

interface CalendarViewProps {
  pickedDate: Date;
  onPickedDateChange: (d: Date) => void;
  monthStart: Date;
  onMonthStartChange: (d: Date) => void;
  statusTab: StatusTab;
  onStatusTabChange: (t: StatusTab) => void;
  onSelect: (post: Draft) => void;
}

function CalendarView({
  pickedDate,
  onPickedDateChange,
  monthStart,
  onMonthStartChange,
  statusTab,
  onStatusTabChange,
  onSelect,
}: CalendarViewProps) {
  const dayCounts = useDayCountsQuery(monthStart);
  const dayBatch = useDayBatchQuery(pickedDate, {
    isAd: true,
    status: statusTab === 'all' ? null : statusTab,
  });

  const monthAdsTotal = sumCounts(dayCounts.data?.ads);
  const items = dayBatch.data ?? [];

  return (
    <div className={styles.sidebar}>
      <div className={styles.calendarWrap}>
        <DatePicker
          value={pickedDate}
          onChange={onPickedDateChange}
          onMonthChange={(d) => onMonthStartChange(firstOfMonth(d))}
          locale="ru"
          minDate={null}
          adsCounts={dayCounts.data?.ads}
          className={styles.calendar}
        />
      </div>

      <div className={styles.dayHeader}>{formatDayHeader(pickedDate)}</div>

      <div className={styles.tabsAndPosts}>
        <div className={styles.tabsRow}>
          {STATUS_TABS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={clsx(styles.tab, statusTab === opt.id && styles.tabActive)}
              onClick={() => onStatusTabChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.adsBadgeRow}>
          <span className={styles.adsBadge}>{monthAdsTotal} рекл.</span>
        </div>

        <PostsList
          loading={dayBatch.isLoading}
          items={items}
          onSelect={onSelect}
          emptyText="Рекламных постов на эту дату нет"
        />
      </div>
    </div>
  );
}

// ──────────── Drafts view: search + list ────────────

interface DraftsViewProps {
  onSelect: (post: Draft) => void;
}

function DraftsView({ onSelect }: DraftsViewProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const drafts = useDraftsListQuery(search);
  const items = drafts.data ?? [];

  return (
    <div className={styles.draftsView}>
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск по черновикам"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <SearchIcon width={12} height={12} />
      </div>

      <div className={styles.draftsList}>
        {drafts.isLoading && (
          <div className={styles.loaderRow}>
            <Loader size={20} color="blue" />
          </div>
        )}
        {!drafts.isLoading && items.length === 0 && (
          <div className={styles.empty}>
            {search ? 'По запросу ничего не найдено' : 'У вас нет черновиков'}
          </div>
        )}
        {!drafts.isLoading &&
          items.map((d) => (
            <DraftRow key={d.id} draft={d} onSelect={() => onSelect(d)} />
          ))}
      </div>
    </div>
  );
}

interface DraftRowProps {
  draft: Draft;
  onSelect: () => void;
}

function DraftRow({ draft, onSelect }: DraftRowProps) {
  const label = getPreviewText(draft) || '(без текста)';
  return (
    <button type="button" className={styles.draftRow} onClick={onSelect}>
      <Checkbox variant="radio" checked={false} onChange={onSelect} />
      <span className={styles.draftLabel}>{label.slice(0, 60)}</span>
    </button>
  );
}

// ──────────── Posts list (calendar/ads) ────────────

interface PostsListProps {
  loading: boolean;
  items: Draft[];
  onSelect: (post: Draft) => void;
  emptyText: string;
}

function PostsList({ loading, items, onSelect, emptyText }: PostsListProps) {
  if (loading) {
    return (
      <div className={styles.postsList}>
        <div className={styles.loaderRow}>
          <Loader size={24} color="blue" />
        </div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className={styles.postsList}>
        <div className={styles.empty}>{emptyText}</div>
      </div>
    );
  }
  return (
    <div className={styles.postsList}>
      {items.slice().sort(byTimeAsc).map((post) => (
        <PostRow key={post.id} post={post} onClick={() => onSelect(post)} />
      ))}
    </div>
  );
}

interface PostRowProps {
  post: Draft;
  onClick: () => void;
}

function PostRow({ post, onClick }: PostRowProps) {
  const date = getItemDate(post);
  const preview = getPreviewText(post) || '(без текста)';
  return (
    <button type="button" className={styles.postRow} onClick={onClick}>
      <span className={styles.postIcon}>
        {post.is_ad ? (
          <WalletAdIcon width={16} height={16} />
        ) : (
          <CalendarDocPostIcon width={16} height={16} />
        )}
      </span>
      {date && <span className={styles.postTime}>{formatTime(date)}</span>}
      <span className={styles.postPreview}>{preview.slice(0, 60)}</span>
    </button>
  );
}

// ──────────── Helpers ────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
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

function byTimeAsc(a: Draft, b: Draft): number {
  return (getItemDate(a)?.getTime() ?? 0) - (getItemDate(b)?.getTime() ?? 0);
}

function sumCounts(counts: Record<string, number> | undefined): number {
  if (!counts) return 0;
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total;
}
