'use client';

import { FC, useRef, useEffect } from "react";
import styles from "../styles.module.scss";
import SortDropdown from "@/components/sort-dropdown";

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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className={styles.popupFilter} ref={popupRef}>
      <div className={styles.popupFilterContent}>
        <div className={styles.popupFilterOptions}>
          {availableSortOptions.map((option) => (
            <SortDropdown
              key={option.type}
              label={option.label}
              options={option.items}
              selectedValue={option.value}
              onSelect={(value: string) => onSortChange(option.type, value)}
              onClear={() => onSortClear(option.type)}
              width={"100%"}
            >
              {option.content}
            </SortDropdown>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopupFilter;