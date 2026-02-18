'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import {
  ArrowsSpinIcon,
  AudioIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
  DocIcon,
  GifIcon,
  PhotoIcon,
  VideoIcon,
} from '@/components/icons';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
import styles from './list-calendar-view.module.scss';

interface ListCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  isLoadingMore?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getSourceDate(post: Draft): string {
  return ((post as any).scheduled_time || (post as any).published_at || post.updated_at || post.created_at);
}

function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Запланирован';
    case 'published':
      return 'Опубликован';
    case 'draft':
      return 'Черновик';
    case 'failed':
      return 'Ошибка';
    default:
      return status;
  }
}

function hasRepeat(post: Draft): boolean {
  const value = (post as any).repeat_interval;
  return !!(value && value !== 'never');
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

function formatCompact(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  if (value >= 1000000) {
    return `${Math.round(value / 100000) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}K`;
  }
  return String(value);
}

function MediaIcons({ post }: { post: Draft }) {
  const mediaTypes = post.media_urls?.length ? getMediaTypes(post.media_urls) : new Set<string>();
  return (
    <div className={styles.mediaIcons}>
      {mediaTypes.has('photo') && <PhotoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('video') && <VideoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('audio') && <AudioIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('doc') && <DocIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('gif') && <GifIcon width={18} height={18} color="#B0B4B8" />}
    </div>
  );
}

export default function ListCalendarView({ posts, isLoading, onEdit, isLoadingMore = false }: ListCalendarViewProps) {

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.empty}>Нет публикаций в этом периоде</div>
    );
  }

  return (
    <>
      <div className={styles.desktopList}>
        {posts.map((post) => {
          const sourceDate = getSourceDate(post);
          const channel = post.channels?.[0];
          const extraChannelsCount = post.channels?.length > 1 ? post.channels.length - 1 : 0;
          const preview = getPreviewText(post);
          const tags = post.tags || [];
          const views = (post as any).views_count ?? (post as any).views;
          const reactions = (post as any).reactions_count ?? (post as any).likes_count;

          return (
            <div
              key={post.id}
              className={styles.row}
              onClick={() => onEdit(post)}
            >
              <div className={styles.leftBlock}>
                <div className={styles.dateTime}>
                  <span className={styles.date}>{formatDate(sourceDate)}</span>
                  <span className={styles.time}>{formatTime(sourceDate)}</span>
                </div>
                <div className={styles.tagsWrap}>
                  {tags.slice(0, 2).map((tag) => (
                    <span key={tag.id} className={styles.tag} style={{ backgroundColor: tag.color || '#B8DBF1' }}>
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className={styles.tagsMore}>+{tags.length - 2}</span>
                  )}
                </div>
              </div>

              <div className={styles.mainBlock}>
                <span className={styles.channelTitle}>
                  {channel?.title || 'Канал'}{extraChannelsCount > 0 ? ` +${extraChannelsCount}` : ''}
                </span>
                <span className={styles.preview}>{preview || '(без текста)'}</span>
              </div>

              <MediaIcons post={post} />

              <div className={styles.statusBlock}>
                <span className={styles.status}>{getStatusLabel(post.status)}</span>
                {hasRepeat(post) && <ArrowsSpinIcon width={14} height={14} color="#B0B4B8" />}
              </div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
                  <span className={styles.statValue}>{formatCompact(views)}</span>
                </div>
                <div className={styles.statItem}>
                  <CalendarReactionsIcon width={12} height={12} color="#B0B4B8" />
                  <span className={styles.statValue}>{formatCompact(reactions)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {isLoadingMore && (
          <div className={styles.listLoader}>
            <Loader size={18} color="blue" />
          </div>
        )}
      </div>

      <div className={styles.mobileList}>
        <div className={styles.mobileListInner}>
          {posts.map((post) => (
            <CalendarCard
              key={post.id}
              post={post}
              onEdit={() => onEdit(post)}
            />
          ))}
          {isLoadingMore && (
            <div className={styles.listLoaderMobile}>
              <Loader size={18} color="blue" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
