'use client';

import FilterTabs, { FilterOption } from '@/components/filter-tabs/filter-tabs';
import AdCard, { Ad } from './AdCard';
import EmptyContent from './EmptyContent';
import SortBar from './SortBar';
import styles from './AdsListSection.module.scss';

const TABS: FilterOption[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expenses', label: 'Расходы' },
];

const INCOME_SORT_OPTIONS = [
  'Дата',
  'Сообщество и тэги',
  'Тип',
  'Цена',
  'Покупатель',
  'Комментарии',
  'Просмотры',
  'Клики',
  'Реакции',
];

const EXPENSES_SORT_OPTIONS = [
  'По дате',
  'По тому что рекламируем',
  'По типу',
  'По цене',
  'По каналу размещения',
  'Приток ПДП',
  'Отписок ПДП',
  'Удержание ПДП',
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
  onSortSelect?: (option: string) => void;
}

export default function AdsListSection({ activeTab, onTabChange, ads, onAddClick, onSortSelect }: AdsListSectionProps) {
  const isExpenses = activeTab === 'expenses';
  const sortOptions = isExpenses ? EXPENSES_SORT_OPTIONS : INCOME_SORT_OPTIONS;
  const emptyTexts = isExpenses ? EXPENSES_EMPTY : INCOME_EMPTY;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Рекламных публикаций: {ads.length}</h2>
        <FilterTabs options={TABS} selectedFilter={activeTab} onFilterChange={onTabChange} />
      </div>

      <SortBar options={sortOptions} onSelect={onSortSelect} />

      {ads.length === 0 ? (
        <EmptyContent
          title={emptyTexts.title}
          description={emptyTexts.description}
          buttonText="Добавить рекламу"
          onButtonClick={onAddClick}
        />
      ) : (
        <div className={styles.list}>
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </section>
  );
}
