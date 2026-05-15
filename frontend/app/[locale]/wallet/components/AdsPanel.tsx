'use client';

import { useMemo } from 'react';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import { CalendarCommentsIcon, CalendarViewsIcon, LinkIcon } from '@/components/icons';
import Loader from '@/components/loader';
import EmptyContent from './EmptyContent';
import { useAdRevenuesQuery } from '@/store/wallet';
import type { AdRevenue, AdRevenueType } from '@/store/wallet';
import styles from './AdsPanel.module.scss';

const TABS: FilterOption[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expense', label: 'Расходы' },
];

const ROW_LIMIT = 50;

interface AdsPanelProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  currency: string;
  enabled?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onAddClick?: () => void;
  onRowClick?: (item: AdRevenue) => void;
}

export default function AdsPanel({
  activeTab,
  onTabChange,
  currency,
  enabled = true,
  dateFrom,
  dateTo,
  onAddClick,
  onRowClick,
}: AdsPanelProps) {
  const adType = activeTab === 'expense' ? 'expense' : 'income';
  const revenuesQuery = useAdRevenuesQuery(
    {
      type: adType,
      currency: enabled ? currency : undefined,
      date_from: dateFrom,
      date_to: dateTo,
      limit: ROW_LIMIT,
      sort_by: 'date',
      sort_dir: 'desc',
    },
    { enabled },
  );

  const items = revenuesQuery.data?.items ?? [];
  const isLoading = revenuesQuery.isLoading;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <section className={styles.panel}>
      <div className={styles.tabsRow}>
        <FilterTabs options={TABS} selectedFilter={activeTab} onFilterChange={onTabChange} />
      </div>

      {isEmpty ? (
        <EmptyContent
          title={adType === 'income' ? 'У вас пока нет рекламных доходов' : 'У вас пока нет рекламных расходов'}
          description={
            adType === 'income'
              ? 'Добавьте рекламную публикацию или доход, чтобы увидеть статистику'
              : 'Добавьте расход за покупку рекламы, чтобы видеть тут детали сделок'
          }
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        <>
          <div className={styles.headerRow}>
            <span className={styles.headCommunity}>Сообщество</span>
            <span className={styles.headBuyer}>Покупатель</span>
            <span className={styles.headAmount}>{adType === 'income' ? 'Доход' : 'Расход'}</span>
            <span className={styles.headMetric}>Просмотры</span>
            <span className={styles.headMetric}>Клики</span>
            <span className={styles.headMetric}>Ссылка</span>
          </div>

          <div className={styles.rows}>
            {isLoading ? (
              <div className={styles.loaderRow}>
                <Loader size={24} color="blue" />
              </div>
            ) : (
              items.map((item) => (
                <AdsRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                />
              ))
            )}
          </div>

          {/* Mobile карточки (<1440px). На десктопе скрыты через CSS. */}
          <div className={styles.cards}>
            {isLoading ? (
              <div className={styles.loaderRow}>
                <Loader size={24} color="blue" />
              </div>
            ) : (
              items.map((item) => (
                <AdsCard
                  key={`card-${item.id}`}
                  item={item}
                  currency={currency}
                  adType={adType}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                />
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

interface AdsCardProps {
  item: AdRevenue;
  currency: string;
  adType: 'income' | 'expense';
  onClick?: () => void;
}

function AdsCard({ item, currency, adType, onClick }: AdsCardProps) {
  const community = useMemo(() => buildCommunityLabel(item), [item]);
  const buyer = item.buyer || '—';
  const amount = formatAmount(item.amount, item.currency || currency);
  const views = item.views_count ?? 0;
  const clicks = item.clicks_count ?? 0;
  const link = item.post_link || item.placements?.[0]?.post_link || null;

  return (
    <div
      className={onClick ? `${styles.card} ${styles.cardClickable}` : styles.card}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={styles.cardHead}>
        <span className={styles.cardCommunity} title={community}>{community}</span>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardLink}
            onClick={(e) => e.stopPropagation()}
            aria-label="Открыть пост"
          >
            <LinkIcon width={14} height={14} color="#B0B4B8" />
          </a>
        ) : (
          <span className={styles.cardLink}>
            <LinkIcon width={14} height={14} color="#E5EAF2" />
          </span>
        )}
      </div>

      <div className={styles.cardStatsRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Покупатель</span>
          <span className={styles.statValue} title={buyer}>{buyer}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{adType === 'income' ? 'Доход' : 'Расход'}</span>
          <span className={styles.statValue}>{amount}</span>
        </div>
      </div>

      <div className={styles.cardMetrics}>
        <span className={styles.cardMetric}>
          <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
          <span>{formatCompact(views)}</span>
        </span>
        <span className={styles.cardMetric}>
          <CalendarCommentsIcon width={12} height={12} color="#B0B4B8" />
          <span>{formatCompact(clicks)}</span>
        </span>
      </div>
    </div>
  );
}

interface AdsRowProps {
  item: AdRevenue;
  currency: string;
  onClick?: () => void;
}

function AdsRow({ item, currency, onClick }: AdsRowProps) {
  const community = useMemo(() => buildCommunityLabel(item), [item]);
  const buyer = item.buyer || '—';
  const amount = formatAmount(item.amount, item.currency || currency);
  const views = item.views_count ?? 0;
  const clicks = item.clicks_count ?? 0;
  const link = item.post_link || item.placements?.[0]?.post_link || null;

  return (
    <div
      className={onClick ? `${styles.row} ${styles.rowClickable}` : styles.row}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className={styles.cellCommunity} title={community}>{community}</span>
      <span className={styles.cellBuyer} title={buyer}>{buyer}</span>
      <span className={styles.cellAmount}>{amount}</span>
      <span className={styles.cellMetric}>
        <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
        <span>{formatCompact(views)}</span>
      </span>
      <span className={styles.cellMetric}>
        <CalendarCommentsIcon width={12} height={12} color="#B0B4B8" />
        <span>{formatCompact(clicks)}</span>
      </span>
      <span className={styles.cellMetric}>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkIcon}
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon width={14} height={14} color="#B0B4B8" />
          </a>
        ) : (
          <span className={styles.dimDash}>—</span>
        )}
      </span>
    </div>
  );
}

function buildCommunityLabel(item: AdRevenue): string {
  const placements = item.placements ?? [];
  if (placements.length > 0) {
    const first = placements[0].title || (placements[0].username ? `@${placements[0].username}` : '');
    const extra = placements.length - 1;
    return extra > 0 ? `${first} +${extra}` : first || '—';
  }
  if (item.channel_username) return `@${item.channel_username.replace(/^@/, '')}`;
  return '—';
}

function formatAmount(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currencySymbol(currency)}`;
}

function currencySymbol(code: string): string {
  if (code === 'RUB') return 'руб';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
