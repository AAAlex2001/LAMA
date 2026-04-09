'use client';

import { useState } from 'react';
import { HeartIcon, HeartSlashIcon } from '../icons';
import styles from './ArticleFeedback.module.scss';

type Props = {
  articleSlug: string;
  locale: string;
  initialLikes: number;
  initialDislikes: number;
};

type FeedbackResponse = {
  likes: number;
  dislikes: number;
};

export default function ArticleFeedback({ articleSlug, locale, initialLikes, initialDislikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [hovered, setHovered] = useState<'up' | 'down' | null>(null);

  const sendFeedback = async (action: 'like' | 'dislike') => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const res = await fetch(
        `${apiBase}/kb/articles/slug/${encodeURIComponent(articleSlug)}/feedback?locale=${locale}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (res.ok) {
        const data: FeedbackResponse = await res.json();
        setLikes(data.likes);
        setDislikes(data.dislikes);
      }
    } catch {
      // ignore
    }
  };

  const handleLike = () => {
    if (feedback === 'up') return;
    setFeedback('up');
    sendFeedback('like');
  };

  const handleDislike = () => {
    if (feedback === 'down') return;
    setFeedback('down');
    sendFeedback('dislike');
  };

  return (
    <section className={styles.block}>
      <div className={styles.btns}>
        <span className={styles.title}>Была ли статья полезной?</span>
        <div className={styles.icons}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Полезно"
            onClick={handleLike}
            onMouseEnter={() => setHovered('up')}
            onMouseLeave={() => setHovered(null)}
          >
            <HeartIcon filled={feedback === 'up'} hovered={hovered === 'up' && feedback !== 'up'} />
            <span className={styles.count}>{likes}</span>
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Не полезно"
            onClick={handleDislike}
            onMouseEnter={() => setHovered('down')}
            onMouseLeave={() => setHovered(null)}
          >
            <HeartSlashIcon filled={feedback === 'down'} hovered={hovered === 'down' && feedback !== 'down'} />
            <span className={styles.count}>{dislikes}</span>
          </button>
          <button type="button" className={styles.shareBtn}>
            <span className={styles.shareBtnText}>Поделиться</span>
          </button>
        </div>
      </div>
    </section>
  );
}
