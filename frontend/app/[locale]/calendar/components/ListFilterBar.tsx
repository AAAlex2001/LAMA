'use client';

import React from 'react';
import { ChevronDownIcon, SortClearIcon, FilterSortIcon } from '@/components/icons';
import styles from './list-filter-bar.module.scss';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface ListFilterBarProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  mobileFilterOpen?: boolean;
  onMobileFilterOpenChange?: (open: boolean) => void;
  hideMobileTrigger?: boolean;
  mobilePopupAnchor?: { bottom: number; right: number } | null;
}

export default function ListFilterBar({
  filters,
  activeFilters,
  onFilterChange,
  mobileFilterOpen,
  onMobileFilterOpenChange,
  hideMobileTrigger = false,
  mobilePopupAnchor = null,
}: ListFilterBarProps) {
  const [openFilter, setOpenFilter] = React.useState<string | null>(null);
  const [internalMobileFilterOpen, setInternalMobileFilterOpen] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);
  const mobileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const isControlledMobileOpen = mobileFilterOpen !== undefined;
  const isMobileOpen = isControlledMobileOpen ? !!mobileFilterOpen : internalMobileFilterOpen;

  function setMobileOpen(next: boolean) {
    if (!isControlledMobileOpen) {
      setInternalMobileFilterOpen(next);
    }
    onMobileFilterOpenChange?.(next);
  }

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        setOpenFilter(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(filter: FilterConfig, optionValue: string) {
    const filterKey = filter.key;
    const current = activeFilters[filterKey] || [];
    let next: string[];

    if (filter.multiSelect) {
      next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
    } else {
      next = current.includes(optionValue) ? [] : [optionValue];
      setOpenFilter(null);
    }

    onFilterChange(filterKey, next);
  }

  function clearFilter(filterKey: string, e: React.MouseEvent) {
    e.stopPropagation();
    onFilterChange(filterKey, []);
    setOpenFilter(null);
  }

  function getButtonText(filter: FilterConfig, activeValues: string[]): string {
    if (!activeValues.length) return filter.label;
    if (activeValues.length === 1) {
      const option = filter.options.find((opt) => opt.value === activeValues[0]);
      return option?.label || filter.label;
    }
    return `${filter.label}: ${activeValues.length}`;
  }

  return (
    <div className={styles.sortBar} ref={barRef}>
      <div className={styles.sortBarDesktop}>
        <span className={styles.sortLabel}>Сортировка:</span>
        <div className={styles.sortGroup}>
          {filters.map((filter) => {
            const active = activeFilters[filter.key] || [];
            const isActive = active.length > 0;
            const isOpen = openFilter === filter.key;

            return (
              <div key={filter.key} className={styles.sortDropdown}>
                <button
                  type="button"
                  className={isActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                  onClick={() => setOpenFilter(isOpen ? null : filter.key)}
                >
                  <span className={styles.sortButtonText}>{getButtonText(filter, active)}</span>
                  <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                  {isActive && (
                    <span className={styles.sortClear} onClick={(event) => clearFilter(filter.key, event)}>
                      <SortClearIcon />
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className={styles.sortMenu}>
                    {filter.options.map((opt) => {
                      const checked = active.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={styles.sortOption}
                          onClick={() => toggleOption(filter, opt.value)}
                        >
                          <span
                            className={
                              filter.multiSelect
                                ? checked
                                  ? `${styles.sortCheckbox} ${styles.sortCheckboxActive}`
                                  : styles.sortCheckbox
                                : checked
                                  ? `${styles.sortRadio} ${styles.sortRadioActive}`
                                  : styles.sortRadio
                            }
                          >
                            <span className={filter.multiSelect ? styles.sortCheckboxDot : styles.sortRadioDot} />
                          </span>
                          {opt.color && (
                            <span className={styles.colorDot} style={{ backgroundColor: opt.color }} />
                          )}
                          <span className={styles.sortOptionText}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.mobileFilterWrapper}>
        {!hideMobileTrigger && (
          <button
            ref={mobileTriggerRef}
            type="button"
            className={styles.mobileFilterButton}
            onClick={() => {
              const nextOpen = !isMobileOpen;
              setMobileOpen(nextOpen);
              if (!nextOpen) setOpenFilter(null);
            }}
            aria-label="Сортировка"
          >
            <FilterSortIcon width={24} height={24} />
          </button>
        )}

        {isMobileOpen && (
          <div className={styles.mobileFilterPopup}>
            {filters.map((filter) => {
              const active = activeFilters[filter.key] || [];
              const isOpen = openFilter === filter.key;

              return (
                <React.Fragment key={filter.key}>
                  <button
                    type="button"
                    className={styles.mobileFilterItem}
                    onClick={() => setOpenFilter(isOpen ? null : filter.key)}
                  >
                    <span className={styles.mobileFilterItemText}>{getButtonText(filter, active)}</span>
                    <ChevronDownIcon width={16} height={16} />
                  </button>

                  {isOpen && (
                    <div className={styles.mobileFilterSubmenu}>
                      {filter.options.map((opt) => {
                        const checked = active.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={styles.sortOption}
                            onClick={() => toggleOption(filter, opt.value)}
                          >
                            <span
                              className={
                                filter.multiSelect
                                  ? checked
                                    ? `${styles.sortCheckbox} ${styles.sortCheckboxActive}`
                                    : styles.sortCheckbox
                                  : checked
                                    ? `${styles.sortRadio} ${styles.sortRadioActive}`
                                    : styles.sortRadio
                              }
                            >
                              <span className={filter.multiSelect ? styles.sortCheckboxDot : styles.sortRadioDot} />
                            </span>
                            {opt.color && (
                              <span className={styles.colorDot} style={{ backgroundColor: opt.color }} />
                            )}
                            <span className={styles.sortOptionText}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
