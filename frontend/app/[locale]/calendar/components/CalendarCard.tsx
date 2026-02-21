'use client';

import { useEffect, useRef, useState } from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { PostIcon, CalendarRepeatIcon } from '@/components/icons';
import DraftContentIcons from '@/app/[locale]/drafts/components/DraftContentIcons';
import Loader from '@/components/loader';
import {
  formatDateDot,
  formatTime,
  getStatusLabel,
  getPreviewHtml,
  getPreviewText,
  getThumbnail,
  hasRepeat,
  getSourceDate,
} from '../utils/calendar-helpers';
import styles from './calendar-card.module.scss';

interface CalendarCardProps {
  post: Draft;
  onEdit: () => void;
  listMode?: boolean;
}

export default function CalendarCard({ post, onEdit, listMode = false }: CalendarCardProps) {
  const sourceDate = getSourceDate(post);
  const time = formatTime(sourceDate);
  const date = formatDateDot(sourceDate);
  const previewHtml = getPreviewHtml(post);
  const previewText = getPreviewText(post);
  const thumbnail = getThumbnail(post);
  const isRepeating = hasRepeat(post);
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
      className={`${styles.card} ${!listMode && post.status === 'published' ? styles.publishedCard : ''}`}
      onClick={onEdit}
    >
      <div className={styles.topSection}>
        <div className={styles.headerRow}>
          <div className={listMode ? styles.timeBlockList : styles.timeBlock}>
            {!listMode && <PostIcon width={16} height={16} color="#3B82F6" />}
            <span className={listMode ? styles.timeList : styles.time}>{listMode ? date : time}</span>
          </div>
          <div className={listMode ? styles.statusIconsOnly : styles.statusBlock}>
            {listMode && <PostIcon width={16} height={16} color="#3B82F6" />}
            {!listMode && <span className={styles.statusText}>{getStatusLabel(post.status)}</span>}
            {isRepeating && (
              <CalendarRepeatIcon width={listMode ? 16 : 14} height={listMode ? 16 : 14} color={listMode ? '#3B82F6' : '#B0B4B8'} />
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

        <div className={listMode ? styles.previewRowList : styles.previewRow}>
          {listMode ? (
            previewText.length > 0 && (
              <div className={styles.previewList}>{previewText}</div>
            )
          ) : (
            previewHtml.trim().length > 0 && (
              <div
                className={styles.preview}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )
          )}
          {thumbnail && !listMode && (
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
