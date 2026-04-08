'use client';

import { useState } from 'react';
import { HeartIcon, HeartSlashIcon } from '../icons';
import styles from './ArticleFeedback.module.scss';

export default function ArticleFeedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [hovered, setHovered] = useState<'up' | 'down' | null>(null);

  return (
    <section className={styles.block}>
      <div className={styles.btns}>
        <span className={styles.title}>Была ли статья полезной?</span>
        <div className={styles.icons}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Полезно"
            onClick={() => setFeedback((v) => (v === 'up' ? null : 'up'))}
            onMouseEnter={() => setHovered('up')}
            onMouseLeave={() => setHovered(null)}
          >
            <HeartIcon filled={feedback === 'up'} hovered={hovered === 'up' && feedback !== 'up'} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Не полезно"
            onClick={() => setFeedback((v) => (v === 'down' ? null : 'down'))}
            onMouseEnter={() => setHovered('down')}
            onMouseLeave={() => setHovered(null)}
          >
            <HeartSlashIcon filled={feedback === 'down'} hovered={hovered === 'down' && feedback !== 'down'} />
          </button>
          <button type="button" className={styles.shareBtn}>
            <span className={styles.shareBtnText}>Поделиться</span>
          </button>
        </div>
      </div>
    </section>
  );
}
