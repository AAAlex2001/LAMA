'use client';

import React, { FC, useRef, useEffect, useState } from "react";
import styles from "../styles.module.scss";
import { ChevronDownIcon, SortClearIcon } from "@/components/icons";

type SortOptionType = 'time' | 'source' | 'sourceSystem' | 'status' | 'type';

interface SortOption {
  type: SortOptionType;
  label: string;
  value: string;
  items?: Array<{ value: string; label: string }>;
  width?: string | number;
  content?: React.ReactNode;
}

interface PopupFilterProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
  availableSortOptions: SortOption[];
  onSortChange: (sortType: SortOptionType, value: string) => void;
  onSortClear: (sortType: SortOptionType) => void;
}

const PopupFilter: FC<PopupFilterProps> = ({
  isOpen,
  onClose,
  triggerRef,
  availableSortOptions,
  onSortChange,
  onSortClear,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  function getButtonText(option: SortOption): string {
    if (!option.value) return option.label;
    if (option.items) {
      const selectedItem = option.items.find((item) => item.value === option.value);
      return selectedItem?.label || option.label;
    }
    return option.label;
  }

  function clearFilter(sortType: SortOptionType, e: React.MouseEvent) {
    e.stopPropagation();
    onSortClear(sortType);
    setOpenFilter(null);
  }

  function toggleOption(option: SortOption, value: string) {
    onSortChange(option.type, value);
    if (!option.content) {
      setOpenFilter(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className={styles.popupFilter} ref={popupRef}>
      <div className={styles.popupFilterContent}>
        <div className={styles.popupFilterOptions}>
          {availableSortOptions.map((option) => {
            const isActive = !!option.value;
            const isOpen = openFilter === option.type;

            return (
              <React.Fragment key={option.type}>
                <button
                  type="button"
                  className={styles.mobileFilterItem}
                  onClick={() => setOpenFilter(isOpen ? null : option.type)}
                >
                  <span className={styles.mobileFilterItemText}>{getButtonText(option)}</span>
                  <ChevronDownIcon width={16} height={16} />
                </button>

                {isOpen && (
                  <div className={styles.mobileFilterSubmenu}>
                    {option.items ? (
                      option.items.map((item) => {
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
                      })
                    ) : option.content ? (
                      <div className={styles.sortMenuContent}>
                        {option.content}
                      </div>
                    ) : null}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopupFilter;