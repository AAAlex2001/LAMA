'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon, FilterSortIcon, ChevronDownIcon } from '@/components/icons';
import ListFilterBar, { type FilterConfig } from './ListFilterBar';
import styles from './month-calendar-view.module.scss';

interface MonthCalendarViewProps {
  selectedDate: Date;
  sidebarDate: Date;
  onSidebarDateChange: (date: Date) => void;
  weekItems: Record<string, Draft[]>;
  gridPostCounts: Record<string, number>;
  onMonthChange: (date: Date) => void;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  isLoading: boolean;
  mobileFilterOpen: boolean;
  onMobileFilterOpenChange: (open: boolean) => void;
  mobileFilterAnchor: { bottom: number; right: number } | null;
  listSortOrder: 'asc' | 'desc' | null;
  onListSortChange: (order: 'asc' | 'desc' | null) => void;
  onLoadMoreDay: (dateKey: string) => void;
  dayLoadingMap: Record<string, boolean>;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getSourceDate(post: Draft): string {
  return (post as any).scheduled_time || (post as any).published_at || post.updated_at || post.created_at;
}

function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getMediaTypes(urls: string[]): Set<string> {
  const types = new Set<string>();
  for (const url of urls) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) types.add('photo');
    else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) types.add('video');
    else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) types.add('audio');
    else if (['gif'].includes(ext)) types.add('gif');
    else types.add('doc');
  }
  return types;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function PostStatusIcon({ status }: { status: string }) {
  if (status === 'published') {
    return <CalendarSidebarSentIcon width={16} height={16} color="#34C759" />;
  }
  return <CalendarSidebarPostIcon width={16} height={16} color="#3B82F6" />;
}

export default function MonthCalendarView({
  selectedDate,
  sidebarDate,
  onSidebarDateChange,
  weekItems,
  gridPostCounts,
  onMonthChange,
  onEdit,
  onAddPost,
  isLoading,
  mobileFilterOpen,
  onMobileFilterOpenChange,
  mobileFilterAnchor,
  listSortOrder,
  onListSortChange,
  onLoadMoreDay,
  dayLoadingMap,
}: MonthCalendarViewProps) {
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
  const [sortPopupOpen, setSortPopupOpen] = React.useState(false);
  const sortWrapperRef = React.useRef<HTMLDivElement>(null);

  const dayKey = formatDateKey(sidebarDate);
  const dayPosts = weekItems[dayKey] || [];

  const filterConfigs: FilterConfig[] = React.useMemo(() => {
    const channelMap = new Map<string, string>();
    const tagMap = new Map<string, { name: string; color?: string }>();
    const mediaTypeSet = new Set<string>();

    dayPosts.forEach((post) => {
      post.channels?.forEach((ch) => {
        channelMap.set(String(ch.id), ch.title || `Канал ${ch.id}`);
      });
      post.tags?.forEach((tag) => {
        tagMap.set(String(tag.id), { name: tag.name, color: tag.color });
      });
      if (post.media_urls?.length) {
        getMediaTypes(post.media_urls).forEach((t) => mediaTypeSet.add(t));
      }
    });

    const configs: FilterConfig[] = [];

    if (channelMap.size > 0) {
      configs.push({
        key: 'channel',
        label: 'По каналам',
        multiSelect: true,
        options: Array.from(channelMap.entries()).map(([id, title]) => ({
          value: id,
          label: title,
        })),
      });
    }

    configs.push({
      key: 'tag',
      label: 'По тегам',
      multiSelect: true,
      options: Array.from(tagMap.entries()).map(([id, { name, color }]) => ({
        value: id,
        label: name,
        color,
      })),
    });

    const mediaTypeLabels: Record<string, string> = {
      photo: 'Фото',
      video: 'Видео',
      audio: 'Аудио',
      doc: 'Документ',
      gif: 'GIF',
    };

    if (mediaTypeSet.size > 0) {
      configs.push({
        key: 'media',
        label: 'По типу контента',
        multiSelect: true,
        options: Array.from(mediaTypeSet).map((t) => ({
          value: t,
          label: mediaTypeLabels[t] || t,
        })),
      });
    }

    return configs;
  }, [dayPosts]);

  const filteredPosts = React.useMemo(() => {
    return dayPosts.filter((post) => {
      if (statusFilter && post.status !== statusFilter) return false;

      const channelFilter = activeFilters['channel'];
      if (channelFilter?.length) {
        const postChannelIds = post.channels?.map((ch) => String(ch.id)) || [];
        if (!channelFilter.some((id) => postChannelIds.includes(id))) return false;
      }

      const tagFilter = activeFilters['tag'];
      if (tagFilter?.length) {
        const postTagIds = post.tags?.map((t) => String(t.id)) || [];
        if (!tagFilter.some((id) => postTagIds.includes(id))) return false;
      }

      const mediaFilter = activeFilters['media'];
      if (mediaFilter?.length) {
        const postMediaTypes = post.media_urls?.length ? getMediaTypes(post.media_urls) : new Set<string>();
        if (!mediaFilter.some((t) => postMediaTypes.has(t))) return false;
      }

      return true;
    });
  }, [dayPosts, statusFilter, activeFilters]);

  function handleFilterChange(key: string, values: string[]) {
    setActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

  // Close sort popup on click outside
  React.useEffect(() => {
    if (!sortPopupOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (sortWrapperRef.current && !sortWrapperRef.current.contains(e.target as Node)) {
        setSortPopupOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortPopupOpen]);

  // Infinite scroll — detect when user scrolls near bottom of main container
  React.useEffect(() => {
    const mainNode = document.querySelector<HTMLElement>('main');
    if (!mainNode) return;

    const THRESHOLD = 120;
    let wasNearBottom = false;

    function onScroll() {
      if (!mainNode) return;
      const { scrollHeight, scrollTop, clientHeight } = mainNode;
      const distToBottom = scrollHeight - scrollTop - clientHeight;
      const nearBottom = distToBottom <= THRESHOLD;

      if (nearBottom && !wasNearBottom) {
        wasNearBottom = true;
        onLoadMoreDay(dayKey);
      }
      if (distToBottom > THRESHOLD * 2) {
        wasNearBottom = false;
      }
    }

    mainNode.addEventListener('scroll', onScroll, { passive: true });
    return () => mainNode.removeEventListener('scroll', onScroll);
  }, [dayKey, onLoadMoreDay]);

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.monthWrap}>
      <div className={styles.calendarCard}>
        <DatePicker
          value={sidebarDate}
          onChange={onSidebarDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          postCounts={gridPostCounts}
          className={styles.monthDatePicker}
        />
      </div>

      <div className={styles.postsCard}>
        <div className={styles.createWrap}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            className={styles.createBtn}
            onClick={() => onAddPost(sidebarDate)}
          />
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.statusTabs}>
            {[
              { key: null as string | null, label: 'Все' },
              { key: 'scheduled' as string | null, label: 'Запланированные' },
              { key: 'published' as string | null, label: 'Опубликованные' },
            ].map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                className={statusFilter === tab.key ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
                onClick={() => setStatusFilter(tab.key)}
              >
                <span className={styles.statusTabText}>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.sortWrapper} ref={sortWrapperRef}>
            <button
              type="button"
              className={styles.sortTrigger}
              onClick={() => setSortPopupOpen((prev) => !prev)}
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

        {filterConfigs.length > 0 && (
          <div className={styles.filterBarWrap}>
            <ListFilterBar
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              mobileFilterOpen={mobileFilterOpen}
              onMobileFilterOpenChange={onMobileFilterOpenChange}
              mobilePopupAnchor={mobileFilterAnchor}
              hideMobileTrigger
            />
          </div>
        )}

        <div className={styles.postList}>
          {filteredPosts.length === 0 ? (
            <div className={styles.empty}>Нет публикаций</div>
          ) : (
            filteredPosts.map((post) => {
              const sourceDate = getSourceDate(post);
              const time = formatTime(sourceDate);
              const preview = getPreviewText(post);
              return (
                <div
                  key={post.id}
                  className={styles.postRow}
                  onClick={() => onEdit(post)}
                >
                  <PostStatusIcon status={post.status} />
                  <span className={styles.postTime}>{time}</span>
                  <span className={styles.postPreview}>{preview || '(без текста)'}</span>
                </div>
              );
            })
          )}
          {dayLoadingMap[dayKey] && (
            <div className={styles.loadMoreWrap}>
              <Loader size={20} color="blue" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
