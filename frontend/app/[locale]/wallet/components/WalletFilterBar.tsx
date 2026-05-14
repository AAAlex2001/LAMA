'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import { SortClearIcon } from '@/components/icons';
import styles from './WalletFilterBar.module.scss';

export interface WalletFilterOption {
  value: string;
  label: string;
}

export interface WalletFilterDef {
  id: string;
  label: string;
  options: WalletFilterOption[];
}

interface WalletFilterBarProps {
  periodLabel: string;
  filters: WalletFilterDef[];
  values: Record<string, string | null>;
  onChange: (filterId: string, value: string | null) => void;
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
          const selected = f.options.find((o) => o.value === value);
          const isActive = !!value;
          const isOpen = openId === f.id;
          const buttonText = selected ? `${f.label} · ${selected.label}` : f.label;
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
                      onChange(f.id, null);
                      setOpenId(null);
                    }}
                  >
                    <SortClearIcon />
                  </span>
                )}
              </button>

              {isOpen && (
                <div className={styles.sortMenu} role="listbox">
                  {f.options.map((opt) => {
                    const checked = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={styles.sortOption}
                        role="option"
                        aria-selected={checked}
                        onClick={() => {
                          onChange(f.id, checked ? null : opt.value);
                          setOpenId(null);
                        }}
                      >
                        <span className={clsx(styles.sortRadio, checked && styles.sortRadioActive)}>
                          <span className={styles.sortRadioDot} />
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
