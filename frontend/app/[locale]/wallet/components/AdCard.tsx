'use client';

import { useState } from 'react';
import { ChevronDownIcon, LinkIcon } from '@/components/icons';
import AdMetricsRow, { AdMetrics } from './AdMetricsRow';
import AdTypeIcons, { AdType } from './AdTypeIcons';
import ExpenseMetricsBlock from './ExpenseMetricsBlock';
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
  subject?: string;
  metrics: AdMetrics;
  metricsValues: { comments: number; views: number; clicks: number; reactions: number };
  expenseMetrics?: ExpenseMetrics;
  types: AdType[];
  postLink?: string;
  placements?: AdPlacement[];
}

export interface ExpenseMetrics {
  subscribersIn24h: number | null;
  subscribersIn48h: number | null;
  subscribersOut24h: number | null;
  subscribersOut48h: number | null;
  retentionRate: number | null;
  costPerSubscriber: number | null;
}

interface AdCardProps {
  ad: Ad;
  onShowPlacements?: (placements: AdPlacement[]) => void;
}

function extractCurrencySymbol(amountStr: string): string {
  const parts = amountStr.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

export default function AdCard({ ad, onShowPlacements }: AdCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const placements = ad.placements ?? [];
  const linkCount = placements.filter((p) => p.postLink).length;
  const singleLink = placements.find((p) => p.postLink)?.postLink ?? ad.postLink;
  const hasLink = linkCount > 0 || Boolean(ad.postLink);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleCardKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleOpen();
    }
  };

  const handleLinkClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (linkCount > 1) {
      onShowPlacements?.(placements);
    } else if (singleLink) {
      window.open(singleLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleOpen();
  };

  return (
    <article
      className={styles.card}
      aria-expanded={isOpen}
      role="button"
      tabIndex={0}
      onClick={toggleOpen}
      onKeyDown={handleCardKeyDown}
    >
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{ad.title}</span>
            {hasLink && (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={handleLinkClick}
                aria-label={linkCount > 1 ? 'Открыть список ссылок' : 'Открыть пост'}
              >
                <LinkIcon width={14} height={14} color="#B0B4B8" />
                {linkCount > 1 && <span className={styles.linkBadge}>+{linkCount - 1}</span>}
              </button>
            )}
          </div>
          <span className={styles.username}>{ad.username}</span>
        </div>
        <div className={styles.amountBlock}>
          <span className={styles.amount}>{ad.amount}</span>
          <span className={styles.date}>{ad.date}</span>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={handleToggleClick}
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
          {ad.expenseMetrics ? (
            <ExpenseMetricsBlock
              metrics={ad.expenseMetrics}
              currency={extractCurrencySymbol(ad.amount)}
            />
          ) : (
            <AdMetricsRow metrics={ad.metrics} />
          )}
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{ad.expenseMetrics ? 'Продавец' : 'Покупатель'}</span>
            <span className={styles.metaValue}>{ad.buyer || '—'}</span>
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
