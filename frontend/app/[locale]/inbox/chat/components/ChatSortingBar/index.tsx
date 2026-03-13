'use client';

import React, { FC, useState, useRef } from "react";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { FilterSortIcon, ChevronDownIcon, SortClearIcon } from "@/components/icons";
import { Button } from "@/components/new-button";
import PopupFilter from "../../../components/InboxSortingBar/components/PopupFilter";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setChatSort, setChatUnreadFilter } from "../../../store";
import { selectChatSort, selectChatUnreadFilter } from "../../../store/selectors";
import type { SortOptionType, SortOption } from "../../../components/sortTypes";

interface ChatSortingBarProps {
  onNavigateToOtherView: () => void;
}

const ChatSortingBar: FC<ChatSortingBarProps> = ({ onNavigateToOtherView }) => {
  const dispatch = useAppDispatch();
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const chatSort = useAppSelector(selectChatSort);
  const chatUnreadFilter = useAppSelector(selectChatUnreadFilter);

  const sortTimeValue = chatSort === 'old' ? 'oldest' : (chatSort === 'new' ? 'newest' : '');
  const sortStatusValue = chatUnreadFilter ?? '';

  const timeOptions = [
    { value: "newest", label: "Сначала новые" },
    { value: "oldest", label: "Сначала старые" },
  ];

  const statusOptions = [
    { value: "all", label: "Все" },
    { value: "unread", label: "Непрочитанные" },
    { value: "read", label: "Прочитанные" },
  ];

  const availableSortOptions: SortOption[] = [
    {
      type: 'time' as SortOptionType,
      label: 'По активности',
      value: sortTimeValue,
      items: timeOptions,
      width: "138px",
    },
    {
      type: 'status' as SortOptionType,
      label: 'По статусу',
      value: sortStatusValue,
      items: statusOptions,
      width: "138px",
    },
  ];

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    if (sortType === 'time') {
      const dir = value === 'oldest' ? 'old' : 'new';
      dispatch(setChatSort(dir));
    }
    if (sortType === 'status') {
      const unreadMap: Record<string, 'unread' | 'read' | null> = {
        'unread': 'unread',
        'read': 'read',
        'all': null,
      };
      dispatch(setChatUnreadFilter(unreadMap[value] ?? null));
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    if (sortType === 'time') {
      dispatch(setChatSort('new'));
    }
    if (sortType === 'status') {
      dispatch(setChatUnreadFilter(null));
    }
  };

  const defaultValues: Record<string, string> = {
    time: '',
    status: '',
  };

  const isDefaultValue = (type: string, value: string): boolean => {
    if (type === 'time') return value === '' || value === 'newest';
    if (type === 'status') return value === '' || value === 'all';
    return value === defaultValues[type];
  };

  function getButtonText(option: SortOption): string {
    if (!option.value || isDefaultValue(option.type, option.value)) return option.label;
    if (option.items) {
      const selectedItem = option.items.find((item) => item.value === option.value);
      return selectedItem?.label || option.label;
    }
    return option.label;
  }

  function clearFilter(sortType: SortOptionType, e: React.MouseEvent) {
    e.stopPropagation();
    handleSortClear(sortType);
    setOpenFilter(null);
  }

  function toggleOption(option: SortOption, value: string) {
    handleSortChange(option.type, value);
    setOpenFilter(null);
  }

  const resetSorting = () => {
    dispatch(setChatSort('new'));
    dispatch(setChatUnreadFilter(null));
    setOpenFilter(null);
  };

  const handleNavigate = () => {
    resetSorting();
    onNavigateToOtherView();
  };

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar} ref={barRef}>
          <Button
            onClick={handleNavigate}
            variant="fill"
            intent="gradient"
            size="lg"
            style={{ width: '100px' }}
          >
            Инбокс
          </Button>
          <div className={styles.sortBarDesktop}>
            <span className={styles.sortLabel}>Сортировка:</span>
            <div className={styles.sortGroup}>
              {availableSortOptions.map((option) => {
                const isActive = !!option.value && !isDefaultValue(option.type, option.value);
                const isOpen = openFilter === option.type;

                return (
                  <div key={option.type} className={styles.sortDropdown}>
                    <button
                      type="button"
                      className={isActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                      onClick={() => setOpenFilter(isOpen ? null : option.type)}
                    >
                      <span className={styles.sortButtonText}>{getButtonText(option)}</span>
                      <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                      {isActive && (
                        <span className={styles.sortClear} onClick={(event) => clearFilter(option.type, event)}>
                          <SortClearIcon />
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className={styles.sortMenu} style={option.width ? { width: typeof option.width === 'number' ? `${option.width}px` : option.width, minWidth: typeof option.width === 'number' ? `${option.width}px` : option.width } : undefined}>
                        {option.items?.map((item) => {
                          const checked = option.value === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              className={styles.sortOption}
                              onClick={() => toggleOption(option, item.value)}
                            >
                              <span
                                className={
                                  checked
                                    ? `${styles.sortRadio} ${styles.sortRadioActive}`
                                    : styles.sortRadio
                                }
                              >
                                <span className={styles.sortRadioDot} />
                              </span>
                              <span className={styles.sortOptionText}>{item.label}</span>
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
        </div>
      </DesktopWrapper>
      <MobileWrapper className={styles.mobileWrapper}>
        <Button
          onClick={handleNavigate}
          variant="fill"
          intent="gradient"
          size="lg"
          style={{ width: '100%' }}
        >
          Инбокс
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
            onClose={() => setIsFilterPopupOpen(false)}
            triggerRef={filterButtonRef}
            availableSortOptions={availableSortOptions}
            onSortChange={handleSortChange}
            onSortClear={handleSortClear}
          />
        </div>
      </MobileWrapper>
    </>
  );
};

export default ChatSortingBar;
