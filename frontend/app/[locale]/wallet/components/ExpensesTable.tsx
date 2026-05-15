'use client';

import {
  LinkIcon,
  RetentionIcon,
  SubscribersInIcon,
  SubscribersOutIcon,
} from '@/components/icons';
import AdTypeIcons from './AdTypeIcons';
import { Ad, AdPlacement, ExpenseMetrics } from './AdCard';
import styles from './ExpensesTable.module.scss';

const COLUMNS = [
  { key: 'date',         label: 'Дата' },
  { key: 'subject',      label: 'Что рекламируем' },
  { key: 'price',        label: 'Цена' },
  { key: 'seller',       label: 'Продавец' },
  { key: 'placement',    label: 'Канал размещения' },
  { key: 'type',         label: 'Тип' },
  { key: 'link',         label: 'Ссылка',  center: true },
  { key: 'subscribersIn',  label: 'Приток ПДП' },
  { key: 'subscribersOut', label: 'Отписок ПДП' },
  { key: 'retention',      label: 'Удержание' },
] as const;

interface ExpensesTableProps {
  ads: Ad[];
  onShowPlacements?: (placements: AdPlacement[]) => void;
}

export default function ExpensesTable({ ads, onShowPlacements }: ExpensesTableProps) {
  return (
    <div className={styles.tableWrap}>
      <div className={styles.headerRow}>
        {COLUMNS.map((col, idx) => (
          <div
            key={col.key}
            className={styles[`col_${col.key}`]}
            style={{
              borderLeft: idx === 0 ? 'none' : '1px solid #F0F4FA',
              justifyContent: 'center' in col && col.center ? 'center' : 'flex-start',
            }}
          >
            <span className={styles.headerLabel}>{col.label}</span>
          </div>
        ))}
      </div>

      {ads.map((ad) => (
        <div key={ad.id} className={styles.dataRow}>
          <div className={styles.col_date}>
            <span className={styles.dateText}>{ad.date}</span>
          </div>
          <div className={styles.col_subject}>
            <span className={styles.subject}>{ad.subject || ad.title || '—'}</span>
          </div>
          <div className={styles.col_price}>
            <span className={styles.price}>{ad.amount}</span>
          </div>
          <div className={styles.col_seller}>
            <span className={styles.seller}>{ad.buyer || '—'}</span>
          </div>
          <div className={styles.col_placement}>
            <PlacementCell ad={ad} onShowPlacements={onShowPlacements} />
          </div>
          <div className={styles.col_type}>
            <AdTypeIcons types={ad.types} />
          </div>
          <div className={styles.col_link}>
            <LinksCell ad={ad} onShowPlacements={onShowPlacements} />
          </div>
          <div className={styles.col_subscribersIn}>
            <SubscribersInBadge metrics={ad.expenseMetrics} currency={extractCurrencySymbol(ad.amount)} />
          </div>
          <div className={styles.col_subscribersOut}>
            <SubscribersOutBadge metrics={ad.expenseMetrics} />
          </div>
          <div className={styles.col_retention}>
            <RetentionBadge metrics={ad.expenseMetrics} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CellProps {
  ad: Ad;
  onShowPlacements?: (placements: AdPlacement[]) => void;
}

function PlacementCell({ ad, onShowPlacements }: CellProps) {
  const placements = ad.placements ?? [];
  const handles = placements
    .map((p) => (p.username ? `@${p.username.replace(/^@/, '')}` : p.title))
    .filter(Boolean);
  if (handles.length === 0) return <span className={styles.empty}>—</span>;

  const first = handles[0];
  const extra = handles.length - 1;
  const link = placements[0].postLink;
  const title = handles.join(', ');

  if (extra > 0) {
    return (
      <button
        type="button"
        className={styles.placementLink}
        title={title}
        onClick={() => onShowPlacements?.(placements)}
      >
        {first} +{extra}
      </button>
    );
  }
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={styles.placementLink} title={title}>
      {first}
    </a>
  ) : (
    <span className={styles.placementLink} title={title}>{first}</span>
  );
}

function LinksCell({ ad, onShowPlacements }: CellProps) {
  const placements = ad.placements ?? [];
  const links = placements.map((p) => p.postLink).filter((l): l is string => Boolean(l));
  if (links.length === 0 && !ad.postLink) return <span className={styles.empty}>—</span>;

  const extra = Math.max(links.length - 1, 0);
  if (extra > 0) {
    return (
      <button
        type="button"
        className={styles.linksCell}
        onClick={() => onShowPlacements?.(placements)}
        title={links.join('\n')}
        aria-label={`Открыть список ссылок (${links.length})`}
      >
        <LinkIcon width={14} height={14} color="#B0B4B8" />
        <span className={styles.linksExtra}>+{extra}</span>
      </button>
    );
  }
  const single = links[0] || ad.postLink || '';
  return (
    <a href={single} target="_blank" rel="noopener noreferrer" aria-label="Открыть пост" className={styles.linkIcon}>
      <LinkIcon width={14} height={14} color="#B0B4B8" />
    </a>
  );
}

function SubscribersInBadge({ metrics, currency }: { metrics?: ExpenseMetrics; currency: string }) {
  const in24 = metrics?.subscribersIn24h;
  const in48 = metrics?.subscribersIn48h;
  const cps = metrics?.costPerSubscriber;
  return (
    <div className={styles.metricBadge}>
      <SubscribersInIcon />
      <span className={styles.metricLabel}>ПДП</span>
      <span className={styles.metricValue}>{formatDelta(in24, '+')}</span>
      <span className={styles.metricValue}>{formatDelta(in48, '+')}</span>
      <span className={styles.metricStrong}>{formatPrice(cps, currency)}</span>
    </div>
  );
}

function SubscribersOutBadge({ metrics }: { metrics?: ExpenseMetrics }) {
  const out24 = metrics?.subscribersOut24h;
  const out48 = metrics?.subscribersOut48h;
  return (
    <div className={styles.metricBadge}>
      <SubscribersOutIcon />
      <span className={styles.metricLabel}>ПДП</span>
      <span className={styles.metricValue}>{formatDelta(out24, '-')}</span>
      <span className={styles.metricValue}>{formatDelta(out48, '-')}</span>
    </div>
  );
}

function RetentionBadge({ metrics }: { metrics?: ExpenseMetrics }) {
  const value = metrics?.retentionRate;
  return (
    <div className={styles.metricBadge}>
      <RetentionIcon />
      <span className={styles.metricStrong}>
        {value === null || value === undefined ? '—' : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

function formatDelta(value: number | null | undefined, sign: '+' | '-'): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  return `${sign}${abs}`;
}

function formatPrice(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} ${currency}`;
}

function extractCurrencySymbol(amountStr: string): string {
  const parts = amountStr.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

