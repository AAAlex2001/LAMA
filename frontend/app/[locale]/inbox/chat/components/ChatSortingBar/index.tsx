'use client';

import { FC, useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { FilterSortIcon, ChevronDownIcon, SortClearIcon } from "@/components/icons";
import { Button } from "@/components/new-button";
import PopupFilter from "../../../components/InboxSortingBar/components/PopupFilter";
import { useChatSortState } from "./hooks/useChatSortState";

interface ChatSortingBarProps {
  onNavigateToOtherView: () => void;
}

const ChatSortingBar: FC<ChatSortingBarProps> = ({ onNavigateToOtherView }) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const {
    openFilter,
    setOpenFilter,
    availableSortOptions,
    handleSortChange,
    handleSortClear,
    clearFilter,
    toggleOption,
    resetSorting,
    isDefaultValue,
    getButtonText,
  } = useChatSortState();

  const handleNavigate = () => {
    resetSorting();
    onNavigateToOtherView();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        setOpenFilter(null);
      }
    };
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
                      className={clsx(styles.sortButton, isActive && styles.sortButtonActive)}
                      onClick={() => setOpenFilter(isOpen ? null : option.type)}
                      aria-expanded={isOpen}
                      aria-haspopup="listbox"
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
                      <div
                        className={styles.sortMenu}
                        role="listbox"
                        style={option.width ? { width: option.width, minWidth: option.width } : undefined}
                      >
                        {option.items?.map((item) => {
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
