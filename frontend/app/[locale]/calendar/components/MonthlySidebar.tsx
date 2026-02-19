'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import Loader from '@/components/loader';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  sortPostsByTime,
  formatDateOnly,
  buildCreatePostUrl,
} from '../utils/calendar-helpers';
import styles from './monthly-sidebar.module.scss';

interface MonthlySidebarProps {
  sidebarDate: Date;
  weekItems: Record<string, Draft[]>;
  onEdit: (post: Draft) => void;
  onLoadMoreDay?: (dateKey: string) => void;
  dayLoading?: Record<string, boolean>;
}

type TabFilter = 'all' | 'scheduled' | 'published';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabFilter>('all');
  const postsListRef = React.useRef<HTMLDivElement>(null);
  const wasNearBottomRef = React.useRef(false);

  const dateKey = formatDateOnly(sidebarDate);
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
          onClick={() => router.push(buildCreatePostUrl(sidebarDate))}
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
                const time = formatTime(getSourceDate(post));
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
