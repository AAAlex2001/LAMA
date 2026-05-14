'use client';

import clsx from 'clsx';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import Loader from '@/components/loader';
import EmptyContent from './EmptyContent';
import type { CommunityFilter, CommunityStatsItem } from '../store/types';
import styles from './CommunitiesPanel.module.scss';

const TABS: FilterOption[] = [
  { id: 'all', label: 'Все' },
  { id: 'channels', label: 'Каналы' },
  { id: 'groups', label: 'Группы' },
  { id: 'bots', label: 'Боты' },
];

interface CommunitiesPanelProps {
  activeTab: CommunityFilter;
  onTabChange: (id: CommunityFilter) => void;
  items: CommunityStatsItem[];
  loading: boolean;
  currency: string;
  selectedChannelId: number | null;
  onChannelSelect: (channelId: number | null) => void;
  onAddClick?: () => void;
}

export default function CommunitiesPanel({
  activeTab,
  onTabChange,
  items,
  loading,
  currency,
  selectedChannelId,
  onChannelSelect,
  onAddClick,
}: CommunitiesPanelProps) {
  const hasItems = items.length > 0;

  return (
    <section className={styles.panel}>
      <div className={styles.tabsRow}>
        <FilterTabs
          options={TABS}
          selectedFilter={activeTab}
          onFilterChange={(id) => onTabChange(id as CommunityFilter)}
        />
      </div>

      {loading ? (
        <div className={styles.loaderRow}>
          <Loader size={24} color="blue" />
        </div>
      ) : !hasItems ? (
        <EmptyContent
          title="Здесь появятся ваши сообщества"
          description="Добавьте рекламные публикации, чтобы видеть доходы и расходы по каждому каналу"
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        <>
          <div className={styles.headerRow}>
            <span className={styles.headTitleCommunity}>Сообщество</span>
            <span className={styles.headCell}>Доходы</span>
            <span className={styles.headCell}>Расходы</span>
            <span className={styles.headCell}>Опублик.</span>
            <span className={styles.headCell}>Заплан.</span>
          </div>

          <div className={styles.rows}>
            {items.map((item) => {
              const isChannel = item.kind !== 'bot';
              const isActive = isChannel && selectedChannelId === item.id;
              return (
                <CommunityRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  currency={currency}
                  active={isActive}
                  onClick={
                    isChannel
                      ? () => onChannelSelect(isActive ? null : item.id)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

interface CommunityRowProps {
  item: CommunityStatsItem;
  currency: string;
  active: boolean;
  onClick?: () => void;
}

function CommunityRow({ item, currency, active, onClick }: CommunityRowProps) {
  const handle = item.username ? `@${item.username.replace(/^@/, '')}` : '';
  const clickable = Boolean(onClick);
  return (
    <div
      className={clsx(styles.row, active && styles.rowActive, clickable && styles.rowClickable)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className={styles.community}>
        <div className={styles.avatar}>
          {item.photo_url ? (
            <img src={item.photo_url} alt="" />
          ) : (
            <span className={styles.avatarFallback}>{getInitials(item.title)}</span>
          )}
        </div>
        <div className={styles.communityText}>
          <span className={styles.communityTitle}>{item.title}</span>
          {handle && <span className={styles.communityHandle}>{handle}</span>}
        </div>
      </div>
      <span className={styles.cell}>{formatMoney(item.income, currency)}</span>
      <span className={styles.cell}>{formatMoney(item.expense, currency)}</span>
      <span className={styles.cell}>{formatInt(item.published_ads_count)}</span>
      <span className={styles.cell}>{formatInt(item.scheduled_ads_count)}</span>
    </div>
  );
}

function getInitials(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || trimmed[0].toUpperCase();
}

function formatMoney(value: string, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ' + currencySymbol(currency);
}

function currencySymbol(code: string): string {
  if (code === 'RUB') return '₽';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code;
}

function formatInt(n: number): string {
  return n > 0 ? String(n) : '—';
}
