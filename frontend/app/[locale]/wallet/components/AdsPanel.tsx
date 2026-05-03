'use client';

import { ReactNode } from 'react';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import EmptyContent from './EmptyContent';
import AdsTableHeader from './AdsTableHeader';
import styles from './ListPanel.module.scss';

const TABS: FilterOption[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expenses', label: 'Расходы' },
];

interface AdsPanelProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  isEmpty?: boolean;
  onAddClick?: () => void;
  children?: ReactNode;
}

export default function AdsPanel({
  activeTab,
  onTabChange,
  isEmpty = true,
  onAddClick,
  children,
}: AdsPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.tabsRow}>
        <FilterTabs options={TABS} selectedFilter={activeTab} onFilterChange={onTabChange} />
      </div>
      <AdsTableHeader />
      {isEmpty ? (
        <EmptyContent
          title="У вас пока нет рекламных публикаций"
          description="Добавьте первую рекламу, чтобы отслеживать доходы, просмотры и клики"
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        children
      )}
    </section>
  );
}
