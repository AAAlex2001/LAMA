'use client';

import FilterTabs from '@/components/filter-tabs/filter-tabs';
import FilterSortIcon from '@/components/icons/filter-sort-icon';
import { DateRangePicker, DateRange } from '@/components/date-range-picker';
import styles from './WalletHeader.module.scss';

export type WalletTopTab = 'main' | 'performance';

const TOP_TABS = [
  { id: 'main', label: 'Главная' },
  { id: 'performance', label: 'Эффективность' },
];

interface WalletHeaderProps {
  activeTab: WalletTopTab;
  onTabChange: (tab: WalletTopTab) => void;
  range: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
  onFiltersClick?: () => void;
}

export default function WalletHeader({
  activeTab,
  onTabChange,
  range,
  onRangeChange,
  onFiltersClick,
}: WalletHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <FilterTabs
          options={TOP_TABS}
          selectedFilter={activeTab}
          onFilterChange={(id) => onTabChange(id as WalletTopTab)}
          className={styles.topTabs}
        />
        <button
          type="button"
          className={styles.filtersBtn}
          onClick={onFiltersClick}
          aria-label="Фильтры"
        >
          <FilterSortIcon width={24} height={24} />
        </button>
      </div>
      <div className={styles.periodRow}>
        <DateRangePicker value={range} onChange={onRangeChange} />
      </div>
    </header>
  );
}
