'use client';

import { useState } from 'react';
import LinkIcon from '@/components/icons/link-icon';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import AdMetricsRow, { AdMetrics } from './AdMetricsRow';
import AdTypeIcons, { AdType } from './AdTypeIcons';
import styles from './AdCard.module.scss';

export interface AdPlacement {
  channelId: number;
  title: string;
  username: string | null;
  photoUrl: string | null;
  postLink: string | null;
}

export interface Ad {
  id: string;
  title: string;
  username: string;
  amount: string;
  amountValue: number;
  date: string;
  dateValue: number;
  buyer: string;
  metrics: AdMetrics;
  metricsValues: { comments: number; views: number; clicks: number; reactions: number };
  types: AdType[];
  postLink?: string;
  placements?: AdPlacement[];
}

interface AdCardProps {
  ad: Ad;
}

export default function AdCard({ ad }: AdCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className={styles.card} aria-expanded={isOpen}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{ad.title}</span>
            <LinkIcon width={14} height={14} color="#B0B4B8" />
          </div>
          <span className={styles.username}>{ad.username}</span>
        </div>
        <div className={styles.amountBlock}>
          <div className={styles.amountRow}>
            <span className={styles.amount}>{ad.amount}</span>
            <span className={styles.date}>{ad.date}</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          <ChevronDownIcon
            width={16}
            height={16}
            color="#383F45"
            className={isOpen ? styles.chevronOpen : undefined}
          />
        </button>
      </header>

      {isOpen && (
        <div className={styles.body}>
          <AdMetricsRow metrics={ad.metrics} />
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Покупатель</span>
            <span className={styles.metaValue}>{ad.buyer}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Тип</span>
            <AdTypeIcons types={ad.types} />
          </div>
        </div>
      )}
    </article>
  );
}
