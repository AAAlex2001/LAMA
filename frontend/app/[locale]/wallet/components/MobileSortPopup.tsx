'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon } from '@/components/icons';
import { SortClearIcon } from '@/components/icons';
import type { WalletFilterDef, WalletFilterValue } from './WalletFilterBar';
import styles from './MobileSortPopup.module.scss';

interface MobileSortPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  filters: WalletFilterDef[];
  values: Record<string, WalletFilterValue>;
  onChange: (filterId: string, value: WalletFilterValue) => void;
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
          const isExpanded = expanded === filter.id;
          const isActive = isValueActive(value);
          const buttonText = renderButtonText(filter, value);

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
                      onChange(filter.id, filter.multi ? [] : null);
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
                    const checked = isOptionChecked(value, opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={styles.option}
                        role="option"
                        aria-selected={checked}
                        onClick={() => {
                          onChange(filter.id, toggleValue(value, opt.value, !!filter.multi));
                          if (!filter.multi) setExpanded(null);
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

function isValueActive(value: WalletFilterValue): boolean {
  if (value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function isOptionChecked(value: WalletFilterValue, option: string): boolean {
  if (Array.isArray(value)) return value.includes(option);
  return value === option;
}

function toggleValue(value: WalletFilterValue, option: string, multi: boolean): WalletFilterValue {
  if (!multi) return value === option ? null : option;
  const arr = Array.isArray(value) ? value : [];
  return arr.includes(option) ? arr.filter((v) => v !== option) : [...arr, option];
}

function renderButtonText(f: WalletFilterDef, value: WalletFilterValue): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return f.label;
    if (value.length === 1) {
      const found = f.options.find((o) => o.value === value[0]);
      return found ? `${f.label} · ${found.label}` : f.label;
    }
    return `${f.label} · ${value.length}`;
  }
  if (typeof value === 'string') {
    const found = f.options.find((o) => o.value === value);
    return found ? `${f.label} · ${found.label}` : f.label;
  }
  return f.label;
}
