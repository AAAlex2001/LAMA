'use client';

import { useState, useEffect } from 'react';
import { HeartIcon, HeartSlashIcon } from '../icons';
import styles from './ArticleFeedback.module.scss';

type Props = {
  articleSlug: string;
  locale: string;
};

const STORAGE_KEY_PREFIX = 'kb_feedback_';

export default function ArticleFeedback({ articleSlug, locale }: Props) {
  const storageKey = `${STORAGE_KEY_PREFIX}${articleSlug}_${locale}`;

  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [hovered, setHovered] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'up' || saved === 'down') {
        setFeedback(saved);
      }
    } catch {
    }
  }, [storageKey]);

  const sendFeedback = async (action: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      await fetch(
        `${apiBase}/kb/articles/slug/${encodeURIComponent(articleSlug)}/feedback?locale=${locale}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
    } catch {
    }
  };

  const handleLike = () => {
    if (feedback === 'up') return;
    const prev = feedback;
    setFeedback('up');
    try { localStorage.setItem(storageKey, 'up'); } catch {}
    sendFeedback(prev === 'down' ? 'switch_to_like' : 'like');
  };

  const handleDislike = () => {
    if (feedback === 'down') return;
    const prev = feedback;
    setFeedback('down');
    try { localStorage.setItem(storageKey, 'down'); } catch {}
    sendFeedback(prev === 'up' ? 'switch_to_dislike' : 'dislike');
  };

  return (
    <section className={styles.block}>
      <div className={styles.btns}>
        <span className={styles.title}>Была ли статья полезной?</span>
        <div className={styles.icons}>
          <div className={styles.reactions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Полезно"
              onClick={handleLike}
              onMouseEnter={() => setHovered('up')}
              onMouseLeave={() => setHovered(null)}
            >
              <HeartIcon filled={feedback === 'up'} hovered={hovered === 'up' && feedback !== 'up'} />
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
            </button>
          </div>
          <button type="button" className={styles.shareBtn}>
            <span className={styles.shareBtnText}>Оставить отзыв</span>
          </button>
        </div>
      </div>
    </section>
  );
}
