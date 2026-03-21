'use client';

import React from 'react';
import type { Draft } from '@/types/post';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
import { useInView } from '../store/useInView';
import { isBeforeToday } from '../utils/calendar-helpers';
import styles from './day-calendar-view.module.scss';

interface DayCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  selectedDate: Date;
}

export default function DayCalendarView({
  posts,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onEdit,
  onAddPost,
  selectedDate,
}: DayCalendarViewProps) {
  const [scrollRootEl, setScrollRootEl] = React.useState<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1439px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const loadingRef = React.useRef(isLoadingMore);
  loadingRef.current = isLoadingMore;
  const hasMoreRef = React.useRef(hasMore);
  hasMoreRef.current = hasMore;
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const isPast = isBeforeToday(selectedDate);

  const { ref: sentinelRef } = useInView({
    root: isMobile ? null : scrollRootEl,
    rootMargin: '0px 0px 400px 0px',
    threshold: 0,
    skip: !hasMore || isLoadingMore || (!isMobile && !scrollRootEl),
    onChange(inView) {
      if (inView && hasMoreRef.current && !loadingRef.current) {
        onLoadMoreRef.current?.();
      }
    },
  });

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.dayWrap}>
      <div className={styles.mobileControls}>
          {!isPast && (
            <div className={styles.createWrap}>
              <Button
                text="Создать публикацию"
                showArrow={false}
                active
                className={styles.createBtn}
                onClick={() => onAddPost(selectedDate)}
              />
            </div>
          )}
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>Нет публикаций на этот день</div>
      ) : (
        <div className={styles.scrollContainer} ref={setScrollRootEl}>
          <div className={styles.list}>
            {posts.map((post) => (
              <CalendarCard
                key={post.id}
                post={post}
                onEdit={() => onEdit(post)}
              />
            ))}
          </div>
          {isLoadingMore && (
            <div className={styles.listLoader}>
              <Loader size={20} color="blue" />
            </div>
          )}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </div>
      )}
    </div>
  );
}
