'use client';

import type { Draft } from '@/types/post';
import {
  CalendarCommentsIcon,
  CalendarReactionsIcon,
  CalendarRepeatIcon,
  EyeIcon,
  TrashIcon,
  WalletAdIcon,
} from '@/components/icons';
import { formatCompact, getPreviewText, getSourceDate, hasRepeat } from '@/[locale]/calendar/utils/calendar-helpers';
import styles from './AttachedPostCard.module.scss';

interface AttachedPostCardProps {
  post: Draft;
  onRemove: () => void;
}

function formatDateShort(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function AttachedPostCard({ post, onRemove }: AttachedPostCardProps) {
  const dateLabel = formatDateShort(getSourceDate(post));
  const tag = post.tags?.[0]?.name;
  const preview = getPreviewText(post) || '(без текста)';
  const channels = post.channels ?? [];
  const firstChannel = channels[0];
  const extraChannels = channels.length > 1 ? channels.length - 1 : 0;
  const views = post.views_count ?? post.views;
  const likes = post.reactions_count ?? post.likes_count;
  const comments = post.comments_count ?? 0;
  const repeat = hasRepeat(post);

  return (
    <div className={styles.row}>
      <div className={styles.card}>
        <div className={styles.topRow}>
          <span className={styles.date}>{dateLabel}</span>
          <div className={styles.topRight}>
            {post.is_ad && (
              <span className={styles.iconBadge}>
                <WalletAdIcon width={16} height={16} />
              </span>
            )}
            {repeat && <CalendarRepeatIcon width={16} height={16} />}
            {tag && (
              <span className={styles.tag} title={tag}>
                {tag}
              </span>
            )}
          </div>
        </div>

        <div className={styles.preview}>{preview}</div>

        <div className={styles.bottomRow}>
          <div className={styles.channels}>
            {firstChannel && (
              <span className={styles.channelName}>{firstChannel.title}</span>
            )}
            {extraChannels > 0 && (
              <span className={styles.channelExtra}>+{extraChannels}</span>
            )}
          </div>
          <div className={styles.metrics}>
            <span className={styles.metric}>
              <EyeIcon width={12} height={12} color="#B0B4B8" />
              {formatCompact(typeof views === 'number' ? views : 0)}
            </span>
            <span className={styles.metric}>
              <CalendarReactionsIcon width={12} height={12} color="#B0B4B8" />
              {formatCompact(typeof likes === 'number' ? likes : 0)}
            </span>
            <span className={styles.metric}>
              <CalendarCommentsIcon width={12} height={12} color="#B0B4B8" />
              {formatCompact(comments)}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.removeBtn}
        onClick={onRemove}
        aria-label="Открепить пост"
      >
        <TrashIcon width={15} height={17} color="#B0B4B8" />
      </button>
    </div>
  );
}
