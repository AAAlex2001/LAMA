'use client';

import { FC } from 'react';
import classNames from 'classnames';
import styles from './filter-tabs.module.scss';

export interface FilterOption {
  id: string;
  label: string;
}

interface FilterTabsProps {
  options: FilterOption[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  className?: string;
}

const FilterTabs: FC<FilterTabsProps> = ({ options, selectedFilter, onFilterChange, className }) => {
  return (
    <div className={classNames(styles.filterTabs, className)}>
      {options.map((option) => (
        <span
          key={option.id}
          className={classNames(styles.filterTab, { [styles.filterTabActive]: selectedFilter === option.id })}
          onClick={() => onFilterChange(option.id)}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
};

export default FilterTabs;
