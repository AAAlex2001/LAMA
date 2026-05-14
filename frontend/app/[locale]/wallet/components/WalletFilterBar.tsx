'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
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
    <div className={styles.bar} ref={barRef}>
      <span className={styles.periodLabel}>{periodLabel}</span>
      <div className={styles.chips}>
        {filters.map((f) => {
          const value = values[f.id] ?? null;
          const selected = f.options.find((o) => o.value === value);
          const isOpen = openId === f.id;
          return (
            <div key={f.id} className={styles.chipWrap}>
              <button
                type="button"
                className={clsx(styles.chip, !!value && styles.chipActive)}
                onClick={() => setOpenId(isOpen ? null : f.id)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span>{selected ? selected.label : f.label}</span>
                <ChevronDownIcon width={16} height={16} color="#1E1E1E" />
              </button>
              {isOpen && (
                <div className={styles.menu} role="listbox">
                  {f.options.map((opt) => {
                    const checked = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={styles.menuItem}
                        role="option"
                        aria-selected={checked}
                        onClick={() => {
                          onChange(f.id, checked ? null : opt.value);
                          setOpenId(null);
                        }}
                      >
                        <span className={clsx(styles.radio, checked && styles.radioActive)}>
                          <span className={styles.radioDot} />
                        </span>
                        <span>{opt.label}</span>
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
