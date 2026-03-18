'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
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
  const scrollElRef = React.useRef<HTMLDivElement | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const loadingRef = React.useRef(isLoadingMore);
  loadingRef.current = isLoadingMore;
  const hasMoreRef = React.useRef(hasMore);
  hasMoreRef.current = hasMore;
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const checkNeedMore = React.useCallback(() => {
    const el = scrollElRef.current;
    if (!el || loadingRef.current || !hasMoreRef.current) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      onLoadMoreRef.current?.();
    }
  }, []);

  const scrollRootRef = React.useCallback((node: HTMLDivElement | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    scrollElRef.current = node;
    if (!node) return;
    node.addEventListener('scroll', checkNeedMore, { passive: true });
    cleanupRef.current = () => node.removeEventListener('scroll', checkNeedMore);
    requestAnimationFrame(checkNeedMore);
  }, [checkNeedMore]);

  React.useEffect(() => {
    if (!isLoadingMore && hasMore) {
      requestAnimationFrame(checkNeedMore);
    }
  }, [isLoadingMore, hasMore, checkNeedMore]);

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
        <div className={styles.createWrap}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            className={styles.createBtn}
            onClick={() => onAddPost(selectedDate)}
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>Нет публикаций на этот день</div>
      ) : (
        <div className={styles.scrollContainer} ref={scrollRootRef}>
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
        </div>
      )}
    </div>
  );
}
