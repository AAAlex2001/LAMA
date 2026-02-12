'use client';

import { useEffect, useRef, useState } from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { PostIcon, ArrowsSpinIcon } from '@/components/icons';
import DraftContentIcons from '@/app/[locale]/drafts/components/DraftContentIcons';
import Loader from '@/components/loader';
import styles from './calendar-card.module.scss';

interface CalendarCardProps {
  post: Draft;
  onEdit: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled': return 'Запланирован';
    case 'published': return 'Опубликован';
    case 'draft': return 'Черновик';
    case 'failed': return 'Ошибка';
    default: return status;
  }
}

function getPreviewHtml(post: Draft): string {
  return post.formatted_content?.html
    || post.formatted_content?.text
    || post.text_content
    || '';
}

function getThumbnail(post: Draft): string | null {
  if (post.media_thumbnail_urls?.length) {
    const thumb = post.media_thumbnail_urls.find(u => u);
    if (thumb) return thumb;
  }
  if (post.media_urls?.length) {
    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    const imageUrl = post.media_urls.find(url => {
      const ext = url.split('.').pop()?.toLowerCase() || '';
      return imageExts.includes(ext);
    });
    if (imageUrl) return imageUrl;
  }
  return null;
}

function hasRepeat(post: Draft): boolean {
  const p = post as any;
  return !!(p.repeat_interval && p.repeat_interval !== 'never');
}

export default function CalendarCard({ post, onEdit }: CalendarCardProps) {
  const time = formatTime(post.status === 'scheduled'
    ? ((post as any).scheduled_time || post.created_at)
    : ((post as any).published_at || post.updated_at || post.created_at));
  const previewHtml = getPreviewHtml(post);
  const thumbnail = getThumbnail(post);
  const isRepeating = hasRepeat(post);
  const isPublished = post.status === 'published';
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setThumbnailLoaded(false);
    setThumbnailError(false);
    const timerId = window.setTimeout(() => {
      if (imgRef.current?.complete) {
        setThumbnailLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [thumbnail]);

  const channel = post.channels?.[0];
  const extraChannelsCount = post.channels?.length > 1 ? post.channels.length - 1 : 0;

  return (
    <div
      className={styles.card}
      style={isPublished ? { opacity: 0.4 } : undefined}
      onClick={onEdit}
    >
      <div className={styles.topSection}>
        <div className={styles.headerRow}>
          <div className={styles.timeBlock}>
            <PostIcon width={16} height={16} color="#3B82F6" />
            <span className={styles.time}>{time}</span>
          </div>
          <div className={styles.statusBlock}>
            <span className={styles.statusText}>{getStatusLabel(post.status)}</span>
            {isRepeating && (
              <ArrowsSpinIcon width={14} height={14} color="#B0B4B8" />
            )}
          </div>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {post.tags.map(tag => (
              <span
                key={tag.id}
                className={styles.tag}
                style={{ backgroundColor: tag.color || '#B8DBF1' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className={styles.previewRow}>
          {previewHtml.trim().length > 0 && (
            <div
              className={styles.preview}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
          {thumbnail && (
            <div className={styles.thumbnail}>
              {!thumbnailLoaded && !thumbnailError && (
                <div className={styles.thumbnailLoader}>
                  <Loader size={18} color="blue" />
                </div>
              )}
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                ref={imgRef}
                onLoad={() => setThumbnailLoaded(true)}
                onError={() => {
                  setThumbnailError(true);
                  setThumbnailLoaded(true);
                }}
                style={{ opacity: thumbnailLoaded ? 1 : 0 }}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.channelInfo}>
          {channel && (
            <>
              {channel.photo_url && (
                <img
                  src={channel.photo_url}
                  alt=""
                  className={styles.channelAvatar}
                />
              )}
              <span className={styles.channelName}>{channel.title}</span>
              {extraChannelsCount > 0 && (
                <span className={styles.channelExtra}>+{extraChannelsCount}</span>
              )}
            </>
          )}
        </div>
        <DraftContentIcons draft={post} />
      </div>
    </div>
  );
}
