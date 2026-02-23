'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import Loader from '@/components/loader';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import { useInView } from '../store/useInView';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  formatDateOnly,
  buildCreatePostUrl,
} from '../utils/calendar-helpers';
import styles from './monthly-sidebar.module.scss';

interface MonthlySidebarProps {
  sidebarDate: Date;
  onEdit: (post: Draft) => void;
}

export default function MonthlySidebar({
  sidebarDate,
  onEdit,
}: MonthlySidebarProps) {
  const router = useRouter();
  const cacheRef = React.useRef<Record<string, { items: Draft[]; page: number; hasMore: boolean }>>({});
  const [posts, setPosts] = React.useState<Draft[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const pageSize = 20;

  const dateKey = formatDateOnly(sidebarDate);
  const dayTitle = formatDayTitle(sidebarDate);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0, skip: isLoadingMore || !hasMore });

  async function loadDayPosts(targetPage: number, append: boolean) {
    const params = new URLSearchParams({
      page: String(targetPage),
      page_size: String(pageSize),
      start_date: `${dateKey}T00:00:00`,
      end_date: `${dateKey}T23:59:59`,
      sort_order: 'desc',
    });

    const response = await apiRequest<{ items: Draft[] }>(`/publications?${params}`);
    const loaded = response.items || [];
    setPosts((prev) => {
      const next = append ? [...prev, ...loaded] : loaded;
      cacheRef.current[dateKey] = {
        items: next,
        page: targetPage,
        hasMore: loaded.length === pageSize,
      };
      return next;
    });
    setPage(targetPage);
    setHasMore(loaded.length === pageSize);
  }

  React.useEffect(() => {
    let isActive = true;

    const cached = cacheRef.current[dateKey];
    if (cached) {
      setPosts(cached.items);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setIsLoading(false);
      setIsLoadingMore(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setIsLoadingMore(false);
    setPosts([]);
    setPage(1);
    setHasMore(false);

    loadDayPosts(1, false)
      .catch(() => {
        if (!isActive) return;
        setPosts([]);
        setHasMore(false);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dateKey]);

  React.useEffect(() => {
    if (!inView || !hasMore || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    loadDayPosts(page + 1, true)
      .finally(() => setIsLoadingMore(false));
  }, [inView, hasMore, isLoadingMore, isLoading, page, dateKey]);

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

      <div className={styles.postsSection}>
        <div className={styles.postsList}>
          <div className={styles.postsInner}>
            {isLoading ? (
              <div className={styles.dayLoader}>
                <Loader size={20} color="blue" />
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyDay}>Нет публикаций</div>
            ) : (
              posts.map((post) => {
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

            {isLoadingMore && (
              <div className={styles.dayLoader}>
                <Loader size={16} color="blue" />
              </div>
            )}

            {hasMore && !isLoadingMore && !isLoading && (
              <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
