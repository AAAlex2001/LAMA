'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { useScrollContainer } from '@/components/app-layout';
import CalendarCard from './CalendarCard';
import { useInView } from '../store/useInView';
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
  const scrollContainer = useScrollContainer();
  const loadingRef = React.useRef(isLoadingMore);
  loadingRef.current = isLoadingMore;
  const hasMoreRef = React.useRef(hasMore);
  hasMoreRef.current = hasMore;
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const { ref: sentinelRef, inView } = useInView({
    root: scrollContainer,
    rootMargin: '0px 0px 400px 0px',
    threshold: 0,
    skip: !hasMore,
  });

  React.useEffect(() => {
    if (inView && hasMoreRef.current && !loadingRef.current) {
      onLoadMoreRef.current?.();
    }
  }, [inView]);

  React.useEffect(() => {
    if (!isLoadingMore && inView && hasMore) {
      const id = setTimeout(() => {
        if (hasMoreRef.current && !loadingRef.current) {
          onLoadMoreRef.current?.();
        }
      }, 100);
      return () => clearTimeout(id);
    }
  }, [isLoadingMore, hasMore]);

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
        <div className={styles.scrollContainer}>
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
          {hasMore && !isLoadingMore && (
            <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
          )}
        </div>
      )}
    </div>
  );
}
