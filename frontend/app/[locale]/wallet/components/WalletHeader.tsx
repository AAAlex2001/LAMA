'use client';

import FilterTabs from '@/components/filter-tabs/filter-tabs';
import FilterSortIcon from '@/components/icons/filter-sort-icon';
import { DateRangePicker, DateRange } from '@/components/date-range-picker';
import { Button } from '@/components/new-button';
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
  onExportClick?: () => void;
}

export default function WalletHeader({
  activeTab,
  onTabChange,
  range,
  onRangeChange,
  onFiltersClick,
  onExportClick,
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
        {activeTab === 'performance' && (
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            className={styles.exportBtn}
            onClick={onExportClick}
          >
            Экспорт данных
          </Button>
        )}
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
