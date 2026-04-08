'use client';

import { useState } from 'react';
import { Button } from '@/components/new-button';
import { HeartIcon, HeartSlashIcon } from '../icons';
import styles from './ArticleFeedback.module.scss';

export default function ArticleFeedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <section className={styles.block}>
      <div className={styles.header}>
        <span className={styles.title}>Была ли статья полезной?</span>
      </div>
      <div className={styles.row}>
        <div className={styles.icons}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Полезно"
            onClick={() => setFeedback('up')}
            data-active={feedback === 'up'}
          >
            <HeartIcon />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Не полезно"
            onClick={() => setFeedback('down')}
            data-active={feedback === 'down'}
          >
            <HeartSlashIcon />
          </button>
        </div>
        <Button variant="outline" intent="gradient" size="md">
          Поделиться
        </Button>
      </div>
    </section>
  );
}
