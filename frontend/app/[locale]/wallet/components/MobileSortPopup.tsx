'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon } from '@/components/icons';
import { SortClearIcon } from '@/components/icons';
import type { WalletFilterDef } from './WalletFilterBar';
import styles from './MobileSortPopup.module.scss';

interface MobileSortPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  filters: WalletFilterDef[];
  values: Record<string, string | null>;
  onChange: (filterId: string, value: string | null) => void;
}

/**
 * Мобильное всплывающее меню сортировки. Внешний вид и поведение совпадают с
 * `PopupFilter` из инбокса: список сортировок вертикально, у каждого пункта
 * раскрывается подменю с radio-выбором направления.
 */
export default function MobileSortPopup({
  isOpen,
  onClose,
  triggerRef,
  filters,
  values,
  onChange,
}: MobileSortPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
        setExpanded(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className={styles.popup} ref={popupRef}>
      <div className={styles.options}>
        {filters.map((filter) => {
          const value = values[filter.id] ?? null;
          const selected = filter.options.find((o) => o.value === value);
          const isExpanded = expanded === filter.id;
          const isActive = !!value;
          const buttonText = selected ? `${filter.label} · ${selected.label}` : filter.label;

          return (
            <Fragment key={filter.id}>
              <button
                type="button"
                className={clsx(styles.item, isActive && styles.itemActive)}
                onClick={() => setExpanded(isExpanded ? null : filter.id)}
                aria-expanded={isExpanded}
                aria-haspopup="listbox"
              >
                <span className={styles.itemText}>{buttonText}</span>
                {isActive && (
                  <span
                    className={styles.clearBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(filter.id, null);
                      setExpanded(null);
                    }}
                  >
                    <SortClearIcon />
                  </span>
                )}
                <ChevronDownIcon
                  className={isExpanded ? styles.chevronOpen : styles.chevron}
                  width={16}
                  height={16}
                />
              </button>

              {isExpanded && (
                <div className={styles.submenu} role="listbox">
                  {filter.options.map((opt) => {
                    const checked = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={styles.option}
                        role="option"
                        aria-selected={checked}
                        onClick={() => {
                          onChange(filter.id, checked ? null : opt.value);
                          setExpanded(null);
                        }}
                      >
                        <span className={clsx(styles.radio, checked && styles.radioActive)}>
                          <span className={styles.radioDot} />
                        </span>
                        <span className={styles.optionText}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
