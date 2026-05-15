'use client';

import { RetentionIcon, SubscribersInIcon, SubscribersOutIcon } from '@/components/icons';
import type { ExpenseMetrics } from './AdCard';
import styles from './ExpenseMetricsBlock.module.scss';

interface ExpenseMetricsBlockProps {
  metrics?: ExpenseMetrics;
  currency: string;
}

export default function ExpenseMetricsBlock({ metrics, currency }: ExpenseMetricsBlockProps) {
  return (
    <div className={styles.block}>
      <div className={styles.row}>
        <SubscribersInIcon width={24} height={24} />
        <span className={styles.label}>ПДП</span>
        <span className={styles.muted}>24 ч {formatDelta(metrics?.subscribersIn24h, '+')}</span>
        <span className={styles.muted}>48 ч {formatDelta(metrics?.subscribersIn48h, '+')}</span>
        <span className={styles.strong}>{formatPrice(metrics?.costPerSubscriber, currency)}</span>
      </div>
      <div className={styles.row}>
        <SubscribersOutIcon width={24} height={24} />
        <span className={styles.label}>ПДП</span>
        <span className={styles.muted}>24 ч {formatDelta(metrics?.subscribersOut24h, '-')}</span>
        <span className={styles.muted}>48 ч {formatDelta(metrics?.subscribersOut48h, '-')}</span>
        <span className={styles.strong} />
      </div>
      <div className={styles.row}>
        <RetentionIcon width={24} height={24} />
        <span className={styles.labelGrow}>Удержание</span>
        <span className={styles.strong}>{formatPercent(metrics?.retentionRate)}</span>
      </div>
    </div>
  );
}

function formatDelta(value: number | null | undefined, sign: '+' | '-'): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '0';
  return `${sign}${Math.abs(value)}`;
}

function formatPrice(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} ${currency}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}
