'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon, SortClearIcon } from '@/components/icons';
import styles from './WalletFilterBar.module.scss';

export interface WalletFilterOption {
  value: string;
  label: string;
}

export type WalletFilterValue = string | string[] | null;

export interface WalletFilterDef {
  id: string;
  label: string;
  options: WalletFilterOption[];
  multi?: boolean;
}

interface WalletFilterBarProps {
  periodLabel: string;
  filters: WalletFilterDef[];
  values: Record<string, WalletFilterValue>;
  onChange: (filterId: string, value: WalletFilterValue) => void;
}

export default function WalletFilterBar({ periodLabel, filters, values, onChange }: WalletFilterBarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const onClick = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openId]);

  return (
    <div className={styles.sortingBar} ref={barRef}>
      <span className={styles.sortLabel}>{periodLabel}</span>
      <div className={styles.sortGroup}>
        {filters.map((f) => {
          const value = values[f.id] ?? null;
          const isActive = isValueActive(value);
          const isOpen = openId === f.id;
          const buttonText = renderButtonText(f, value);
          return (
            <div key={f.id} className={styles.sortDropdown}>
              <button
                type="button"
                className={clsx(styles.sortButton, isActive && styles.sortButtonActive)}
                onClick={() => setOpenId(isOpen ? null : f.id)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.sortButtonText}>{buttonText}</span>
                <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                {isActive && (
                  <span
                    className={styles.sortClear}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(f.id, f.multi ? [] : null);
                      setOpenId(null);
                    }}
                  >
                    <SortClearIcon />
                  </span>
                )}
              </button>

              {isOpen && (
                <div className={styles.sortMenu} role="listbox">
                  {f.options.length === 0 && (
                    <div className={styles.sortEmpty}>Пока нет вариантов</div>
                  )}
                  {f.options.map((opt) => {
                    const checked = isOptionChecked(value, opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={styles.sortOption}
                        role="option"
                        aria-selected={checked}
                        onClick={() => {
                          onChange(f.id, toggleValue(value, opt.value, !!f.multi));
                          if (!f.multi) setOpenId(null);
                        }}
                      >
                        <span
                          className={clsx(
                            f.multi ? styles.sortCheck : styles.sortRadio,
                            checked && (f.multi ? styles.sortCheckActive : styles.sortRadioActive),
                          )}
                        >
                          <span className={f.multi ? styles.sortCheckMark : styles.sortRadioDot} />
                        </span>
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
