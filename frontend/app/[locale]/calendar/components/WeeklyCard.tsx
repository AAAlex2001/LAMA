'use client';

import type { Draft } from '@/app/[locale]/create-post/store/types';
import {
  PostIcon,
  CalendarCheckIcon,
  CalendarRepeatIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
} from '@/components/icons';
import DraftContentIcons from '@/app/[locale]/drafts/components/DraftContentIcons';
import styles from './weekly-card.module.scss';

interface WeeklyCardProps {
  post: Draft;
  onEdit: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html
    || post.formatted_content?.text
    || post.text_content
    || '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function hasRepeat(post: Draft): boolean {
  const p = post as any;
  return !!(p.repeat_interval && p.repeat_interval !== 'never');
}

export default function WeeklyCard({ post, onEdit }: WeeklyCardProps) {
  const time = formatTime(
    post.status === 'scheduled'
      ? ((post as any).scheduled_time || post.created_at)
      : ((post as any).published_at || post.updated_at || post.created_at)
  );
  const previewText = getPreviewText(post);
  const isRepeating = hasRepeat(post);
  const isPublished = post.status === 'published';
  const isSent = post.status === 'published';
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
          {isSent ? (
            <CalendarCheckIcon />
          ) : (
            <PostIcon width={16} height={16} color="#3B82F6" />
          )}
          {isRepeating && (
            <CalendarRepeatIcon />
          )}
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

      {channel && (
        <span className={styles.channelName}>
          {channel.title}
          {extraChannelsCount > 0 && ` +${extraChannelsCount}`}
        </span>
      )}

      {isPublished ? (
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <CalendarReactionsIcon />
            <span className={styles.statValue}>
              {(post as any).reactions_count ?? '—'}
            </span>
          </div>
          <div className={styles.statItem}>
            <CalendarViewsIcon />
            <span className={styles.statValue}>
              {(post as any).views_count ?? '—'}
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
