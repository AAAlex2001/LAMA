'use client';

import { FC, useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { ListHeaderType } from "../InboxList/components/ListHeader";
import { FilterSortIcon, ChevronDownIcon, SortClearIcon } from "@/components/icons";
import { Button } from "@/components/new-button";
import PopupFilter from "./components/PopupFilter";
import { useAppSelector } from "../../store";
import { selectChannels, selectBots } from "../../store/selectors";
import type { SortOptionType, SortOption } from "../sortTypes";
import { useSourceFilter } from "./hooks/useSourceFilter";
import { useTypeFilter } from "./hooks/useTypeFilter";
import { useFilterApplication } from "./hooks/useFilterApplication";
import { useSortOptions } from "./hooks/useSortOptions";
import { useSortState } from "./hooks/useSortState";

const filterSortConfig: Record<ListHeaderType, SortOptionType[]> = {
  all: ['time', 'source', 'status'],
  moderation: ['time', 'source'],
  system: ['time', 'source'],
  automation: ['time', 'type'],
};

const filterOptions = [
  { id: "all", label: "Все" },
  { id: "moderation", label: "Модерация" },
  { id: "system", label: "Системные" },
  { id: "automation", label: "Автоматизация" },
];

interface InboxSortingBarProps {
  selectedFilter: ListHeaderType;
  setSelectedFilter: (filter: ListHeaderType) => void;
  onNavigateToOtherView: () => void;
  onTimeSortChange?: (sort: 'new' | 'old') => void;
  onStatusFilterChange?: (status: 'new' | 'processed' | 'banned' | null) => void;
  onEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
}

const InboxSortingBar: FC<InboxSortingBarProps> = ({
  selectedFilter,
  setSelectedFilter,
  onNavigateToOtherView,
  onTimeSortChange,
  onStatusFilterChange,
  onEventTypeFilterChange,
}) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const channels = useAppSelector(selectChannels);
  const bots = useAppSelector(selectBots);

  const channelNames = channels.map((c) => c.title);
  const botNames = bots.map((b) => b.title || b.username);

  const sourceFilter = useSourceFilter({ channelNames, botNames });
  const typeFilter = useTypeFilter({ botNames });
  const filterApplication = useFilterApplication({ channels, bots });
  const sortState = useSortState();

  const { availableSortOptions } = useSortOptions({
    selectedFilter,
    sortValues: sortState.sortValues,
    sourceDefault: sourceFilter.sourceDefault,
    setSourceDefault: sourceFilter.setSourceDefault,
    sourceFilterOptions: sourceFilter.sourceFilterOptions,
    typeDefault: typeFilter.typeDefault,
    setTypeDefault: typeFilter.setTypeDefault,
    typeFilterOptions: typeFilter.typeFilterOptions,
  });

  const applySourceFilters = useCallback(() => {
    filterApplication.applySourceFilters(
      sourceFilter.sourceDefault,
      sourceFilter.systemChecked,
      sourceFilter.selectedChannels,
      sourceFilter.selectedBots,
      sourceFilter.sourceSharedSearch
    );
  }, [filterApplication, sourceFilter]);

  const applyTypeFilters = useCallback(() => {
    filterApplication.applyTypeFilters(
      typeFilter.typeDefault,
      typeFilter.typeAutoReply,
      typeFilter.typeTrigger,
      typeFilter.typeCommand,
      typeFilter.selectedTypeBots,
      typeFilter.typeSharedSearch
    );
  }, [filterApplication, typeFilter]);

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    sortState.handleSortChange(sortType, value);
    if (sortType === 'time') {
      onTimeSortChange?.(value === 'oldest' ? 'old' : 'new');
    }
    if (sortType === 'status') {
      const statusMap: Record<string, 'new' | 'processed' | null> = {
        new: 'new',
        processed: 'processed',
        default: null,
      };
      onStatusFilterChange?.(statusMap[value] ?? null);
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    sortState.handleSortClear(sortType);

    if (sortType === 'time') {
      onTimeSortChange?.('new');
    }
    if (sortType === 'status') {
      onStatusFilterChange?.(null);
    }
    if (sortType === 'type') {
      onEventTypeFilterChange?.(null);
      filterApplication.clearTypeFilters();
    }
  };

  const clearFilter = (sortType: SortOptionType, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSortClear(sortType);

    if (sortType === 'source') {
      sourceFilter.reset();
      filterApplication.clearSourceFilters();
    }

    if (sortType === 'type') {
      typeFilter.reset();
      filterApplication.clearTypeFilters();
    }
    sortState.setOpenFilter(null);
  };

  const toggleOption = (option: SortOption, value: string) => {
    handleSortChange(option.type, value);
    if (!option.content) {
      sortState.setOpenFilter(null);
    }
  };

  useEffect(() => {
    sortState.resetSortValues();
    sourceFilter.reset();
    typeFilter.reset();
    filterApplication.clearAllFilters();
    onTimeSortChange?.('new');
    onStatusFilterChange?.(null);
    onEventTypeFilterChange?.(null);
  }, [selectedFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        if (sortState.openFilter === 'source') {
          applySourceFilters();
        }
        if (sortState.openFilter === 'type') {
          applyTypeFilters();
        }
        sortState.setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortState.openFilter, applySourceFilters, applyTypeFilters]);

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar} ref={barRef}>
          <Button
            onClick={onNavigateToOtherView}
            variant="fill"
            size="lg"
            intent="gradient"
            style={{ width: '100px', minWidth: '100px' }}
          >
            Директ
          </Button>
          <div className={styles.sortBarDesktop}>
            <span className={styles.sortLabel}>Сортировка:</span>
            <div className={styles.sortGroup}>
              {availableSortOptions.map((option: SortOption) => {
                let isActive = false;
                if (option.type === 'source') {
                  isActive = !sourceFilter.sourceDefault;
                } else if (option.type === 'type') {
                  isActive = !typeFilter.typeDefault;
                } else {
                  isActive = !!option.value && !sortState.isDefaultValue(option.type, option.value);
                }
                const isOpen = sortState.openFilter === option.type;

                return (
                  <div key={option.type} className={styles.sortDropdown}>
                    <button
                      type="button"
                      className={clsx(styles.sortButton, isActive && styles.sortButtonActive)}
                      onClick={() => {
                        if (sortState.openFilter === 'source') {
                          applySourceFilters();
                        }
                        if (sortState.openFilter === 'type') {
                          applyTypeFilters();
                        }
                        sortState.setOpenFilter(isOpen ? null : option.type);
                      }}
                      aria-expanded={isOpen}
                      aria-haspopup="listbox"
                    >
                      <span className={styles.sortButtonText}>{sortState.getButtonText(option)}</span>
                      <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                      {isActive && (
                        <span className={styles.sortClear} onClick={(event) => clearFilter(option.type, event)}>
                          <SortClearIcon />
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className={styles.sortMenu} role="listbox">
                        {option.items ? (
                          option.items.map((item: { value: string; label: string }) => {
                            const checked = option.value === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={styles.sortOption}
                                role="option"
                                aria-selected={checked}
                                onClick={() => toggleOption(option, item.value)}
                              >
                                <span
                                  className={clsx(styles.sortRadio, checked && styles.sortRadioActive)}
                                >
                                  <span className={styles.sortRadioDot} />
                                </span>
                                <span className={styles.sortOptionText}>{item.label}</span>
                              </button>
                            );
                          })
                        ) : option.content ? (
                          <div className={styles.sortMenuContent}>
                            {option.content}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <FilterTabs
            options={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={(filterId) => setSelectedFilter(filterId as ListHeaderType)}
            className={styles.filterControls}
          />
        </div>
      </DesktopWrapper>
      <MobileWrapper className={styles.mobileWrapperTabs}>
        <FilterTabs
          options={filterOptions}
          selectedFilter={selectedFilter}
          onFilterChange={(filterId) => setSelectedFilter(filterId as ListHeaderType)}
          className={styles.filterControls}
        />
        <div className={styles.mobileWrapper}>
          <Button
            onClick={onNavigateToOtherView}
            variant="fill"
            intent="gradient"
            style={{ width: '100%' }}
            size="lg"
          >
            Директ
          </Button>
          <div ref={filterButtonRef} className={styles.filterButton}>
            <Button
              onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)}
              variant="ghost"
              intent="neutral"
              size="transparent"
            >
              <FilterSortIcon width={24} height={24} />
            </Button>
            <PopupFilter
              isOpen={isFilterPopupOpen}
              onClose={() => {
                const sortTypes = filterSortConfig[selectedFilter];
                if (sortTypes.includes('source')) {
                  applySourceFilters();
                }
                if (sortTypes.includes('type')) {
                  applyTypeFilters();
                }
                setIsFilterPopupOpen(false);
              }}
              triggerRef={filterButtonRef}
              availableSortOptions={availableSortOptions}
              onSortChange={handleSortChange}
              onSortClear={handleSortClear}
            />
          </div>
        </div>
      </MobileWrapper>
    </>
  );
};

export default InboxSortingBar;
