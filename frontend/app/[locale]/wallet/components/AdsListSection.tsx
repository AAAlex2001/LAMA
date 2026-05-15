'use client';

import { useRef, useState } from 'react';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import FilterSortIcon from '@/components/icons/filter-sort-icon';
import AdCard, { Ad, AdPlacement } from './AdCard';
import AdsTable from './AdsTable';
import EmptyContent from './EmptyContent';
import MobileSortPopup from './MobileSortPopup';
import PlacementsModal from './PlacementsModal';
import WalletFilterBar, { WalletFilterDef } from './WalletFilterBar';
import type { AdRevenueSortKey } from '../store/types';
import styles from './AdsListSection.module.scss';

const TABS: FilterOption[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expenses', label: 'Расходы' },
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'desc', label: 'По убыванию' },
  { value: 'asc', label: 'По возрастанию' },
];

const INCOME_FILTERS: WalletFilterDef[] = [
  { id: 'date', label: 'Дата', options: SORT_DIRECTION_OPTIONS },
  { id: 'price', label: 'Цена', options: SORT_DIRECTION_OPTIONS },
  { id: 'type', label: 'Тип', options: SORT_DIRECTION_OPTIONS },
  { id: 'comments', label: 'Комментарии', options: SORT_DIRECTION_OPTIONS },
  { id: 'views', label: 'Просмотры', options: SORT_DIRECTION_OPTIONS },
  { id: 'clicks', label: 'Клики', options: SORT_DIRECTION_OPTIONS },
  { id: 'reactions', label: 'Реакции', options: SORT_DIRECTION_OPTIONS },
];

const EXPENSES_FILTERS: WalletFilterDef[] = [
  { id: 'date', label: 'По дате', options: SORT_DIRECTION_OPTIONS },
  { id: 'price', label: 'По цене', options: SORT_DIRECTION_OPTIONS },
  { id: 'type', label: 'По типу', options: SORT_DIRECTION_OPTIONS },
];

const INCOME_EMPTY = {
  title: 'У вас пока нет рекламных публикаций',
  description: 'Добавьте рекламное размещение, чтобы отслеживать просмотры, клики, комментарии и реакции',
};

const EXPENSES_EMPTY = {
  title: 'Пока нет данных об эффективности рекламы',
  description: 'Добавьте рекламные размещения, чтобы отслеживать приток подписчиков, отток и удержание аудитории',
};

interface AdsListSectionProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  ads: Ad[];
  onAddClick?: () => void;
  periodLabel?: string;
  sortBy: AdRevenueSortKey;
  sortDir: 'asc' | 'desc';
  statusFilter: 'scheduled' | 'published' | undefined;
  onSortChange: (by: AdRevenueSortKey, dir: 'asc' | 'desc') => void;
  onStatusFilterChange: (s: 'scheduled' | 'published' | undefined) => void;
}

const VALID_SORT_KEYS: AdRevenueSortKey[] = [
  'date', 'price', 'type', 'comments', 'views', 'clicks', 'reactions',
];

export default function AdsListSection({
  activeTab,
  onTabChange,
  ads,
  onAddClick,
  periodLabel,
  sortBy,
  sortDir,
  onSortChange,
}: AdsListSectionProps) {
  const isExpenses = activeTab === 'expenses';
  const filterDefs = isExpenses ? EXPENSES_FILTERS : INCOME_FILTERS;
  const emptyTexts = isExpenses ? EXPENSES_EMPTY : INCOME_EMPTY;

  // На мобилке сортировка живёт во всплывающем popup'е (как в инбоксе),
  // открывается по нажатию на иконку фильтра справа от табов. На десктопе
  // popup не рисуется — там WalletFilterBar чипами всегда виден.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const [placementsModal, setPlacementsModal] = useState<AdPlacement[] | null>(null);

  const filterValues: Record<string, string | null> = { [sortBy]: sortDir };

  const handleFilterChange = (id: string, value: string | null) => {
    if (!VALID_SORT_KEYS.includes(id as AdRevenueSortKey)) return;
    const nextDir: 'asc' | 'desc' = value === 'asc' ? 'asc' : 'desc';
    onSortChange(id as AdRevenueSortKey, nextDir);
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Рекламные публикации: {ads.length}</h2>
        <FilterTabs options={TABS} selectedFilter={activeTab} onFilterChange={onTabChange} />
        <div className={styles.filtersBtnWrap}>
          <button
            ref={filtersBtnRef}
            type="button"
            className={styles.filtersBtn}
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-label="Сортировка"
            aria-expanded={mobileFiltersOpen}
          >
            <FilterSortIcon width={24} height={24} />
          </button>
          <MobileSortPopup
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            triggerRef={filtersBtnRef}
            filters={filterDefs}
            values={filterValues}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      <div className={styles.filterBarDesktop}>
        <WalletFilterBar
          periodLabel={periodLabel || 'За весь период'}
          filters={filterDefs}
          values={filterValues}
          onChange={handleFilterChange}
        />
      </div>

      {ads.length === 0 ? (
        <EmptyContent
          title={emptyTexts.title}
          description={emptyTexts.description}
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        <>
          <div className={styles.list}>
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} onShowPlacements={setPlacementsModal} />
            ))}
          </div>
          <AdsTable ads={ads} onShowPlacements={setPlacementsModal} />
        </>
      )}

      {placementsModal && (
        <PlacementsModal placements={placementsModal} onClose={() => setPlacementsModal(null)} />
      )}
    </section>
  );
}
