'use client';

import FilterTabs from '@/components/filter-tabs/filter-tabs';
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
  onExportClick?: () => void;
}

export default function WalletHeader({
  activeTab,
  onTabChange,
  range,
  onRangeChange,
  onExportClick,
}: WalletHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.exportBtnMobile}>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          style={{ width: '100%' }}
          onClick={onExportClick}
        >
          Экспорт данных
        </Button>
      </div>

      <div className={styles.topRow}>
        <FilterTabs
          options={TOP_TABS}
          selectedFilter={activeTab}
          onFilterChange={(id) => onTabChange(id as WalletTopTab)}
          className={styles.topTabs}
        />
        <div className={styles.exportBtnDesktopWrap}>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            onClick={onExportClick}
          >
            Экспорт данных
          </Button>
        </div>
      </div>
      <div className={styles.periodRow}>
        <DateRangePicker value={range} onChange={onRangeChange} />
      </div>
    </header>
  );
}
