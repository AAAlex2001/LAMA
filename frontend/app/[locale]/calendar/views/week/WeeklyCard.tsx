'use client';

import type { Draft } from '@/types/post';
import {
  CalendarDocPostIcon,
  CalendarDraftIcon,
  CalendarRepeatIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
  CalendarBotMessageIcon,
} from '@/components/icons';
import DraftContentIcons from '@/app/[locale]/drafts/components/DraftContentIcons';
import {
  formatTime,
  getPreviewText,
  hasRepeat,
  getSourceDate,
} from '../../utils/calendar-helpers';
import styles from './weekly-card.module.scss';

interface WeeklyCardProps {
  post: Draft;
  onEdit: () => void;
}

export default function WeeklyCard({ post, onEdit }: WeeklyCardProps) {
  const time = formatTime(getSourceDate(post));
  const previewText = getPreviewText(post);
  const isRepeating = hasRepeat(post);
  const isPublished = post.status === 'published';
  const isDraft = post.status === 'draft';
  const isBotMessage = post.is_bot_message === true;
  const isSeries = (post.series_count ?? 0) > 1;
  const channel = post.channels?.[0];
  const extraChannelsCount = post.channels && post.channels.length > 1
    ? post.channels.length - 1
    : 0;

  return (
    <div
      className={`${styles.card} ${isPublished ? styles.published : ''}`}
      onClick={onEdit}
    >
      <div className={styles.headerRow}>
        <span className={styles.time}>{time}</span>
        <div className={styles.icons}>
          {isBotMessage ? (
            <CalendarBotMessageIcon width={14} height={14} />
          ) : isDraft ? (
            <CalendarDraftIcon width={14} height={14} />
          ) : (
            <CalendarDocPostIcon width={14} height={14} />
          )}
          {isRepeating && (
            <CalendarRepeatIcon />
          )}
          {isSeries && <span className={styles.seriesBadge}>Серия · {post.series_count}</span>}
        </div>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {post.tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className={styles.tag}
              style={{ backgroundColor: tag.color || '#B8DBF1' }}
            >
              {tag.name}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className={styles.tag} style={{ backgroundColor: '#B8DBF1' }}>
              +{post.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {previewText && (
        <div className={styles.preview}>{previewText}</div>
      )}

      {isBotMessage ? (
        <span className={styles.channelName}>@{post.bot_username}</span>
      ) : channel ? (
        <span className={styles.channelName}>
          {channel.title}
          {extraChannelsCount > 0 && ` +${extraChannelsCount}`}
        </span>
      ) : null}

      {isPublished ? (
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <CalendarReactionsIcon />
            <span className={styles.statValue}>
              {post.reactions_count ?? 0}
            </span>
          </div>
          <div className={styles.statItem}>
            <CalendarViewsIcon />
            <span className={styles.statValue}>
              {post.views_count ?? 0}
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.mediaIcons}>
          <DraftContentIcons draft={post} />
        </div>
      )}
    </div>
  );
}
