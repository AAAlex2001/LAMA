'use client';

import { ReactNode } from 'react';
import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import EmptyContent from './EmptyContent';
import styles from './ListPanel.module.scss';

const TABS: FilterOption[] = [
  { id: 'all', label: 'Все' },
  { id: 'channels', label: 'Каналы' },
  { id: 'groups', label: 'Группы' },
  { id: 'bots', label: 'Боты' },
];

interface CommunitiesPanelProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  isEmpty?: boolean;
  onAddClick?: () => void;
  children?: ReactNode;
}

export default function CommunitiesPanel({
  activeTab,
  onTabChange,
  isEmpty = true,
  onAddClick,
  children,
}: CommunitiesPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.tabsRow}>
        <FilterTabs options={TABS} selectedFilter={activeTab} onFilterChange={onTabChange} />
      </div>
      {isEmpty ? (
        <EmptyContent
          title="Здесь появятся ваши сообщества"
          description="Добавьте рекламные публикации, чтобы видеть доходы и расходы по каждому каналу"
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        children
      )}
    </section>
  );
}
