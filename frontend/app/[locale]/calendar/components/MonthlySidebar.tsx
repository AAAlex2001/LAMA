'use client';

import React from 'react';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import Loader from '@/components/loader';
import styles from './monthly-sidebar.module.scss';

interface MonthlySidebarProps {
  sidebarDate: Date;
  weekItems: Record<string, Draft[]>;
  onEdit: (post: Draft) => void;
  onLoadMoreDay?: (dateKey: string) => void;
  dayLoading?: Record<string, boolean>;
}

type TabFilter = 'all' | 'scheduled' | 'published';

const DAY_NAMES_FULL: Record<number, string> = {
  0: 'воскресенье',
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
};

const MONTH_NAMES_GEN: string[] = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDayTitle(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_GEN[date.getMonth()];
  const weekDay = DAY_NAMES_FULL[date.getDay()];
  return `${day} ${month}, ${weekDay}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getPreviewText(post: Draft): string {
  const html =
    post.formatted_content?.html ||
    post.formatted_content?.text ||
    post.text_content ||
    '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sortPostsByTime(posts: Draft[]): Draft[] {
  return [...posts].sort((a, b) => {
    const aTime = new Date(
      (a as any).scheduled_time || a.updated_at || a.created_at
    ).getTime();
    const bTime = new Date(
      (b as any).scheduled_time || b.updated_at || b.created_at
    ).getTime();
    return aTime - bTime;
  });
}

const TAB_LABELS: Record<TabFilter, string> = {
  all: 'Все',
  scheduled: 'По расписанию',
  published: 'Опубликовано',
};

export default function MonthlySidebar({
  sidebarDate,
  weekItems,
  onEdit,
  onLoadMoreDay,
  dayLoading,
}: MonthlySidebarProps) {
  const [activeTab, setActiveTab] = React.useState<TabFilter>('all');
  const postsListRef = React.useRef<HTMLDivElement>(null);
  const wasNearBottomRef = React.useRef(false);

  const dateKey = formatDateKey(sidebarDate);
  const dayPosts = weekItems[dateKey] || [];
  const sortedPosts = sortPostsByTime(dayPosts);
  const dayTitle = formatDayTitle(sidebarDate);
  const isLoadingDay = dayLoading?.[dateKey] ?? false;

  const handlePostsScroll = React.useCallback(() => {
    const el = postsListRef.current;
    if (!el || !onLoadMoreDay) return;
    const nearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 12;
    if (nearBottom && !wasNearBottomRef.current && !isLoadingDay) {
      wasNearBottomRef.current = true;
      onLoadMoreDay(dateKey);
    }
    if (!nearBottom) wasNearBottomRef.current = false;
  }, [dateKey, onLoadMoreDay, isLoadingDay]);

  const filteredPosts = React.useMemo(() => {
    if (activeTab === 'all') return sortedPosts;
    return sortedPosts.filter((p) => p.status === activeTab);
  }, [sortedPosts, activeTab]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.dayTitle}>{dayTitle}</div>

      <div className={styles.createBtnWrapper}>
        <Button
          text="Создать публикацию"
          showArrow={false}
          active
          fullWidth
          className={styles.createBtn}
          onClick={() => {
            const yyyy = sidebarDate.getFullYear();
            const mm = String(sidebarDate.getMonth() + 1).padStart(2, '0');
            const dd = String(sidebarDate.getDate()).padStart(2, '0');
            window.location.href = `/create-post?date=${yyyy}-${mm}-${dd}`;
          }}
        />
      </div>

      <div className={styles.tabsRow}>
        {(Object.keys(TAB_LABELS) as TabFilter[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className={styles.postsSection}>
        <div className={styles.postsList} ref={postsListRef} onScroll={handlePostsScroll}>
          <div className={styles.postsInner}>
            {filteredPosts.length === 0 ? (
              <div className={styles.emptyDay}>Нет публикаций</div>
            ) : (
              filteredPosts.map((post) => {
                const time = formatTime(
                  post.status === 'scheduled'
                    ? ((post as any).scheduled_time || post.created_at)
                    : ((post as any).published_at || post.updated_at || post.created_at)
                );
                const preview = getPreviewText(post);
                const isPublished = post.status === 'published';

                return (
                  <div
                    key={post.id}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    <div className={styles.postIcon}>
                      {isPublished ? <CalendarSidebarSentIcon /> : <CalendarSidebarPostIcon />}
                    </div>
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                  </div>
                );
              })
            )}
            {isLoadingDay && (
              <div className={styles.dayLoader}>
                <Loader size={16} color="blue" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
