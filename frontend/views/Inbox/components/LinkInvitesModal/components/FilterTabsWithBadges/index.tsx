'use client';

import React from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FilterOptionWithBadge {
  id: string;
  label: string;
  count: number;
  style?: React.CSSProperties;
}

interface FilterTabsWithBadgesProps {
  options: FilterOptionWithBadge[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  className?: string;
}

const FilterTabsWithBadges: React.FC<FilterTabsWithBadgesProps> = ({
  options,
  selectedFilter,
  onFilterChange,
  className,
}) => {
  return (
    <div className={classNames(styles.filterTabs, className)}>
      {options.map((option) => {
        const isActive = selectedFilter === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={classNames(styles.filterTab, {
              [styles.filterTabActive]: isActive,
            })}
            style={option.style}
            onClick={() => onFilterChange(option.id)}
          >
            <span className={styles.filterTabLabel}>{option.label}</span>
            <span
              className={classNames(styles.badge, {
                [styles.badgeActive]: isActive,
              })}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabsWithBadges;
