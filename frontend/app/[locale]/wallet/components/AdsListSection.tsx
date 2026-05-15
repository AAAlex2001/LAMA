'use client';

import { useMemo, useRef, useState } from 'react';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import { FilterSortIcon } from '@/components/icons';
import AdCard, { Ad, AdPlacement } from './AdCard';
import AdsTable from './AdsTable';
import ExpensesTable from './ExpensesTable';
import EmptyContent from './EmptyContent';
import MobileSortPopup from './MobileSortPopup';
import PlacementsModal from './PlacementsModal';
import WalletFilterBar, { WalletFilterDef, WalletFilterValue } from './WalletFilterBar';
import type { AdRevenueSortKey } from '@/store/wallet';
import styles from './AdsListSection.module.scss';

const TABS: FilterOption[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expense', label: 'Расходы' },
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'desc', label: 'По убыванию' },
  { value: 'asc', label: 'По возрастанию' },
];

const AD_TYPE_OPTIONS = [
  { value: 'ad',         label: 'Реклама' },
  { value: 'recurring',  label: 'Повторяющийся' },
  { value: 'autoDelete', label: 'Автоудаление' },
  { value: 'pinned',     label: 'Закреплённый' },
  { value: 'draft',      label: 'Запланированный' },
];

const INCOME_SORT_FILTERS: WalletFilterDef[] = [
  { id: 'date',     label: 'Дата',         options: SORT_DIRECTION_OPTIONS },
  { id: 'price',    label: 'Цена',         options: SORT_DIRECTION_OPTIONS },
  { id: 'comments', label: 'Комментарии',  options: SORT_DIRECTION_OPTIONS },
  { id: 'views',    label: 'Просмотры',    options: SORT_DIRECTION_OPTIONS },
  { id: 'clicks',   label: 'Клики',        options: SORT_DIRECTION_OPTIONS },
  { id: 'reactions',label: 'Реакции',      options: SORT_DIRECTION_OPTIONS },
];

const EXPENSE_SORT_FILTERS: WalletFilterDef[] = [
  { id: 'date',            label: 'По дате',         options: SORT_DIRECTION_OPTIONS },
  { id: 'price',           label: 'По цене',         options: SORT_DIRECTION_OPTIONS },
  { id: 'subscribers_in',  label: 'Приток ПДП',      options: SORT_DIRECTION_OPTIONS },
  { id: 'subscribers_out', label: 'Отписок ПДП',     options: SORT_DIRECTION_OPTIONS },
  { id: 'retention',       label: 'Удержание ПДП',   options: SORT_DIRECTION_OPTIONS },
];

const SORT_FILTER_ID_PREFIX = 'sort:';
const MULTI_FILTER_IDS = {
  adType: 'adType',
  subject: 'subject',
  placement: 'placement',
} as const;

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
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  periodLabel?: string;
  sortBy: AdRevenueSortKey;
  sortDir: 'asc' | 'desc';
  statusFilter: 'scheduled' | 'published' | undefined;
  onSortChange: (by: AdRevenueSortKey, dir: 'asc' | 'desc') => void;
  onStatusFilterChange: (s: 'scheduled' | 'published' | undefined) => void;
}

export default function AdsListSection({
  activeTab,
  onTabChange,
  ads,
  onAddIncome,
  onAddExpense,
  periodLabel,
  sortBy,
  sortDir,
  onSortChange,
}: AdsListSectionProps) {
  const isExpenses = activeTab === 'expense';
  const onAddClick = isExpenses ? onAddExpense : onAddIncome;

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const [placementsModal, setPlacementsModal] = useState<AdPlacement[] | null>(null);
  const [adTypeFilter, setAdTypeFilter] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string[]>([]);
  const [placementFilter, setPlacementFilter] = useState<string[]>([]);

  const subjectOptions = useMemo(() => collectSubjectOptions(ads), [ads]);
  const placementOptions = useMemo(() => collectPlacementOptions(ads), [ads]);

  const filterDefs: WalletFilterDef[] = useMemo(() => {
    const sortDefs = (isExpenses ? EXPENSE_SORT_FILTERS : INCOME_SORT_FILTERS).map((d) => ({
      ...d,
      id: `${SORT_FILTER_ID_PREFIX}${d.id}`,
    }));
    if (!isExpenses) {
      return [
        ...sortDefs,
        { id: MULTI_FILTER_IDS.adType, label: 'Тип', options: AD_TYPE_OPTIONS, multi: true },
      ];
    }
    return [
      sortDefs[0],
      { id: MULTI_FILTER_IDS.subject, label: 'По тому что рекламируем', options: subjectOptions, multi: true },
      { id: MULTI_FILTER_IDS.adType,  label: 'По типу',                  options: AD_TYPE_OPTIONS,   multi: true },
      sortDefs[1],
      { id: MULTI_FILTER_IDS.placement, label: 'По каналу размещения',   options: placementOptions,  multi: true },
      sortDefs[2],
      sortDefs[3],
      sortDefs[4],
    ];
  }, [isExpenses, subjectOptions, placementOptions]);

  const filterValues: Record<string, WalletFilterValue> = {
    [`${SORT_FILTER_ID_PREFIX}${sortBy}`]: sortDir,
    [MULTI_FILTER_IDS.adType]: adTypeFilter,
    [MULTI_FILTER_IDS.subject]: subjectFilter,
    [MULTI_FILTER_IDS.placement]: placementFilter,
  };

  const handleFilterChange = (id: string, value: WalletFilterValue) => {
    if (id === MULTI_FILTER_IDS.adType) {
      setAdTypeFilter(toStringArray(value));
      return;
    }
    if (id === MULTI_FILTER_IDS.subject) {
      setSubjectFilter(toStringArray(value));
      return;
    }
    if (id === MULTI_FILTER_IDS.placement) {
      setPlacementFilter(toStringArray(value));
      return;
    }
    if (id.startsWith(SORT_FILTER_ID_PREFIX)) {
      const sortId = id.slice(SORT_FILTER_ID_PREFIX.length) as AdRevenueSortKey;
      const dir: 'asc' | 'desc' = value === 'asc' ? 'asc' : 'desc';
      onSortChange(sortId, dir);
    }
  };

  const visibleAds = useMemo(
    () => applyMultiFilters(ads, { adType: adTypeFilter, subjects: subjectFilter, placements: placementFilter }),
    [ads, adTypeFilter, subjectFilter, placementFilter],
  );

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Рекламные публикации: {visibleAds.length}</h2>
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

      {visibleAds.length === 0 ? (
        <EmptyContent
          title={ads.length === 0 ? (isExpenses ? EXPENSES_EMPTY.title : INCOME_EMPTY.title) : 'Под фильтр ничего не подходит'}
          description={ads.length === 0
            ? (isExpenses ? EXPENSES_EMPTY.description : INCOME_EMPTY.description)
            : 'Попробуйте сбросить фильтры или поменять период'}
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        <>
          <div className={styles.list}>
            {visibleAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} onShowPlacements={setPlacementsModal} />
            ))}
          </div>
          {isExpenses ? (
            <ExpensesTable ads={visibleAds} onShowPlacements={setPlacementsModal} />
          ) : (
            <AdsTable ads={visibleAds} onShowPlacements={setPlacementsModal} />
          )}
        </>
      )}

      {placementsModal && (
        <PlacementsModal placements={placementsModal} onClose={() => setPlacementsModal(null)} />
      )}
    </section>
  );
}

function toStringArray(value: WalletFilterValue): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function collectSubjectOptions(ads: Ad[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const result: { value: string; label: string }[] = [];
  for (const ad of ads) {
    const subject = (ad.subject || ad.title || '').trim();
    if (!subject || seen.has(subject)) continue;
    seen.add(subject);
    result.push({ value: subject, label: subject });
  }
  return result;
}

function collectPlacementOptions(ads: Ad[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const result: { value: string; label: string }[] = [];
  for (const ad of ads) {
    for (const placement of ad.placements ?? []) {
      const key = placement.username
        ? `@${placement.username.replace(/^@/, '')}`
        : placement.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({ value: key, label: key });
    }
  }
  return result;
}

interface MultiFilterState {
  adType: string[];
  subjects: string[];
  placements: string[];
}

function applyMultiFilters(ads: Ad[], state: MultiFilterState): Ad[] {
  const { adType, subjects, placements } = state;
  if (adType.length === 0 && subjects.length === 0 && placements.length === 0) return ads;
  return ads.filter((ad) => {
    if (adType.length > 0 && !adType.some((t) => ad.types.includes(t as Ad['types'][number]))) {
      return false;
    }
    if (subjects.length > 0) {
      const subj = (ad.subject || ad.title || '').trim();
      if (!subjects.includes(subj)) return false;
    }
    if (placements.length > 0) {
      const adPlacementKeys = (ad.placements ?? []).map((p) =>
        p.username ? `@${p.username.replace(/^@/, '')}` : p.title,
      );
      if (!placements.some((p) => adPlacementKeys.includes(p))) return false;
    }
    return true;
  });
}
