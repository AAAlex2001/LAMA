'use client';

import React from 'react';
import { CloseIcon, PostIcon, CalendarRepeatIcon } from '@/components/icons';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DraftContentIcons from '@/app/[locale]/drafts/components/DraftContentIcons';
import DraftCardActions from '@/app/[locale]/drafts/components/DraftCardActions';
import {
  formatDateDot,
  formatTime,
  getPreviewText,
  getSourceDate,
  hasRepeat,
} from '../utils/calendar-helpers';
import styles from './calendar-post-modal.module.scss';

interface CalendarPostModalProps {
  isOpen: boolean;
  post: Draft | null;
  onClose: () => void;
  onPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function isImageUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext);
}

function getMediaPreviewUrls(post: Draft): { urls: string[]; extraCount: number } {
  const urls = post.media_urls || [];
  const thumbs = post.media_thumbnail_urls || [];

  const resolved = urls
    .map((url, index) => thumbs[index] || (isImageUrl(url) ? url : null))
    .filter((url): url is string => Boolean(url));

  return {
    urls: resolved.slice(0, 2),
    extraCount: Math.max(0, urls.length - 2),
  };
}

export default function CalendarPostModal({
  isOpen,
  post,
  onClose,
  onPreview,
  onShare,
  onDelete,
  onEdit,
}: CalendarPostModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const sourceDate = getSourceDate(post);
  const time = formatTime(sourceDate);
  const date = formatDateDot(sourceDate);
  const previewText = getPreviewText(post);
  const tags = post.tags || [];
  const channel = post.channels?.[0];
  const extraChannelsCount = post.channels?.length && post.channels.length > 1
    ? post.channels.length - 1
    : 0;
  const isRepeating = hasRepeat(post);
  const { urls: mediaUrls, extraCount } = getMediaPreviewUrls(post);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Закрыть"
        >
          <CloseIcon width={20} height={20} color="#1E1E1E" />
        </button>

        <div className={styles.topRow}>
          <div className={styles.dateTimeWrap}>
            <span className={styles.time}>{time}</span>
            <span className={styles.date}>{date}</span>
          </div>
          <div className={styles.statusIcons}>
            <PostIcon width={16} height={16} color="#1E1E1E" />
            {isRepeating && <CalendarRepeatIcon width={16} height={16} color="#1E1E1E" />}
          </div>
        </div>

        {tags.length > 0 && (
          <div className={styles.tagsScroller}>
            {tags.map((tag) => (
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

        {mediaUrls.length > 0 && (
          <div className={styles.mediaRow}>
            {mediaUrls.map((url, index) => (
              <div key={`${url}-${index}`} className={styles.mediaItem}>
                <img src={url} alt="" className={styles.mediaImage} />
              </div>
            ))}
            {extraCount > 0 && <span className={styles.extraMedia}>+{extraCount}</span>}
          </div>
        )}

        <div className={styles.previewText}>{previewText || '(без текста)'}</div>

        <div className={styles.channelRow}>
          {channel?.photo_url && <img src={channel.photo_url} alt="" className={styles.channelAvatar} />}
          <span className={styles.channelName}>{channel?.title || 'Канал'}</span>
          {extraChannelsCount > 0 && <span className={styles.channelExtra}>+{extraChannelsCount}</span>}
        </div>

        <div className={styles.bottomRow}>
          <DraftContentIcons draft={post} />
          <DraftCardActions
            onPreview={onPreview}
            onShare={onShare}
            onDelete={onDelete}
            onEdit={onEdit}
            tooltipPlacement="top"
          />
        </div>
      </div>
    </div>
  );
}
