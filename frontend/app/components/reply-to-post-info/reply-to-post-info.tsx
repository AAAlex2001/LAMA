import { useState } from 'react';
import { TrashIcon } from '@/components/icons';
import styles from './reply-to-post-info.module.scss';

interface ReplyToPostInfoProps {
  postTitle: string;
  publishedAt: string; // ISO format
  onRemove: () => void;
}

export default function ReplyToPostInfo({ postTitle, publishedAt, onRemove }: ReplyToPostInfoProps) {
  const [hoveredDelete, setHoveredDelete] = useState(false);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };

  const formatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={styles.replyToPostInfo}>
      <div className={styles.postDetails}>
        <span className={styles.time}>{formatTime(publishedAt)}</span>
        <span className={styles.date}>{formatDate(publishedAt)}</span>
        <span className={styles.title}>{postTitle}</span>
      </div>

      <div className={styles.deleteButtonWrapper}>
        <button
          className={styles.deleteButton}
          onClick={onRemove}
          onMouseEnter={() => setHoveredDelete(true)}
          onMouseLeave={() => setHoveredDelete(false)}
          aria-label="Удалить ответ"
        >
          <TrashIcon
            width={15}
            height={16.67}
            color={hoveredDelete ? '#EF4444' : '#B0B4B8'}
          />
        </button>
        {hoveredDelete && (
          <div className={styles.deleteTooltip}>удалить?</div>
        )}
      </div>
    </div>
  );
}
