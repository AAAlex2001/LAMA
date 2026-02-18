'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
import ListFilterBar, { type FilterConfig } from './ListFilterBar';
import styles from './day-calendar-view.module.scss';

interface DayCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  mobileFilterOpen: boolean;
  onMobileFilterOpenChange: (open: boolean) => void;
  mobileFilterAnchor: { bottom: number; right: number } | null;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  selectedDate: Date;
}

function getMediaTypes(urls: string[]): Set<string> {
  const types = new Set<string>();
  for (const url of urls) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
      types.add('photo');
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      types.add('video');
    } else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) {
      types.add('audio');
    } else if (['gif'].includes(ext)) {
      types.add('gif');
    } else {
      types.add('doc');
    }
  }
  return types;
}

export default function DayCalendarView({
  posts,
  isLoading,
  isLoadingMore = false,
  mobileFilterOpen,
  onMobileFilterOpenChange,
  mobileFilterAnchor,
  onEdit,
  onAddPost,
  selectedDate,
}: DayCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({
    status: [],
  });

  const filterConfigs: FilterConfig[] = React.useMemo(() => {
    const channelMap = new Map<string, string>();
    const tagMap = new Map<string, { name: string; color?: string }>();
    const mediaTypeSet = new Set<string>();

    posts.forEach((post) => {
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
  }, [posts]);

  const filteredPosts = React.useMemo(() => {
    const statusFilter = activeFilters['status']?.[0];

    return posts.filter((post) => {
      if (statusFilter && post.status !== statusFilter) {
        return false;
      }

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
  }, [posts, activeFilters]);

  function handleFilterChange(key: string, values: string[]) {
    setActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

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
        <div className={styles.mobileMiniTabs}>
          {[
            { key: 'all', label: 'Все', status: null as string | null },
            { key: 'scheduled', label: 'Запланированные', status: 'scheduled' as string | null },
            { key: 'published', label: 'Опубликованные', status: 'published' as string | null },
          ].map((tab) => {
            const activeStatus = activeFilters['status']?.[0] || null;
            const isActive = activeStatus === tab.status;
            return (
              <button
                key={tab.key}
                type="button"
                className={isActive ? `${styles.mobileMiniTab} ${styles.mobileMiniTabActive}` : styles.mobileMiniTab}
                onClick={() => {
                  setActiveFilters((prev) => ({
                    ...prev,
                    status: tab.status ? [tab.status] : [],
                  }));
                }}
              >
                <span className={styles.mobileMiniTabText}>{tab.label}</span>
              </button>
            );
          })}
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

      {filteredPosts.length === 0 ? (
        <div className={styles.empty}>Нет публикаций на этот день</div>
      ) : (
        <div className={styles.list}>
          {filteredPosts.map((post) => (
            <CalendarCard
              key={post.id}
              post={post}
              onEdit={() => onEdit(post)}
            />
          ))}
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
