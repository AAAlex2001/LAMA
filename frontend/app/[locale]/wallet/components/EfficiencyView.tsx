'use client';

import { useMemo, useState } from 'react';
import AdsListSection from './AdsListSection';
import { Ad } from './AdCard';
import type { AdRevenue, AdRevenueSortKey } from '@/store/wallet';
import styles from './EfficiencyView.module.scss';

interface EfficiencyViewProps {
  ads: AdRevenue[];
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  periodLabel?: string;
  sortBy: AdRevenueSortKey;
  sortDir: 'asc' | 'desc';
  statusFilter: 'scheduled' | 'published' | undefined;
  onSortChange: (by: AdRevenueSortKey, dir: 'asc' | 'desc') => void;
  onStatusFilterChange: (s: 'scheduled' | 'published' | undefined) => void;
}

export default function EfficiencyView({
  ads,
  onAddIncome,
  onAddExpense,
  periodLabel,
  sortBy,
  sortDir,
  statusFilter,
  onSortChange,
  onStatusFilterChange,
}: EfficiencyViewProps) {
  const [adsTab, setAdsTab] = useState('income');

  const filtered = useMemo(
    () => ads.filter((a) => a.type === adsTab).map(mapToAd),
    [ads, adsTab],
  );

  return (
    <div className={styles.view}>
      <AdsListSection
        activeTab={adsTab}
        onTabChange={setAdsTab}
        ads={filtered}
        onAddIncome={onAddIncome}
        onAddExpense={onAddExpense}
        periodLabel={periodLabel}
        sortBy={sortBy}
        sortDir={sortDir}
        statusFilter={statusFilter}
        onSortChange={onSortChange}
        onStatusFilterChange={onStatusFilterChange}
      />
    </div>
  );
}

function mapToAd(r: AdRevenue): Ad {
  const comments = r.comments_count ?? 0;
  const views = r.views_count ?? 0;
  const clicks = r.clicks_count ?? 0;
  const reactions = r.reactions_count ?? 0;
  const placements = (r.placements ?? []).map((p) => ({
    channelId: p.channel_id,
    title: p.title,
    username: p.username,
    photoUrl: p.photo_url,
    postLink: p.post_link,
  }));
  const firstTitle = placements[0]?.title || r.channel_username || '—';
  const firstUsername = placements[0]?.username || (r.channel_username || '').replace(/^@/, '');
  const types: ('ad' | 'recurring' | 'autoDelete' | 'pinned' | 'draft')[] = ['ad'];
  if (r.is_repeating) types.push('recurring');
  if (r.is_auto_delete) types.push('autoDelete');
  if (r.is_pinned) types.push('pinned');
  if (r.publication_status === 'scheduled' || r.publication_status === 'draft') {
    types.push('draft');
  }
  const amountValue = Number(r.amount) || 0;
  const subIn24 = r.subscribers_in_24h ?? null;
  const costPerSubscriber = subIn24 && subIn24 > 0 ? amountValue / subIn24 : null;
  return {
    id: String(r.id),
    title: firstTitle + (placements.length > 1 ? ` +${placements.length - 1}` : ''),
    username: firstUsername ? `@${firstUsername}` : '',
    amount: `${formatAmount(r.amount)} ${currencySymbol(r.currency)}`,
    amountValue,
    date: formatDate(r.revenue_date),
    dateValue: new Date(r.revenue_date).getTime(),
    buyer: r.buyer || '',
    subject: r.note || '',
    metrics: {
      comments: String(comments),
      views: String(views),
      clicks: String(clicks),
      reactions: String(reactions),
    },
    metricsValues: { comments, views, clicks, reactions },
    expenseMetrics: {
      subscribersIn24h: subIn24,
      subscribersIn48h: r.subscribers_in_48h ?? null,
      subscribersOut24h: r.subscribers_out_24h ?? null,
      subscribersOut48h: r.subscribers_out_48h ?? null,
      retentionRate: r.retention_rate ?? null,
      costPerSubscriber,
    },
    types,
    postLink: r.post_link ?? placements[0]?.postLink ?? undefined,
    placements,
  };
}

function formatAmount(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currencySymbol(code: string): string {
  if (code === 'RUB') return '₽';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y.slice(-2)}`;
}
