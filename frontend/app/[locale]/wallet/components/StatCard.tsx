'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import AddIconButton from './AddIconButton';
import styles from './StatCard.module.scss';

interface StatCardProps {
  title: string;
  value: ReactNode;
  currency?: string;
  currencies?: string[];
  onCurrencyChange?: (currency: string) => void;
  onAddClick?: () => void;
}

export default function StatCard({
  title,
  value,
  currency,
  currencies,
  onCurrencyChange,
  onAddClick,
}: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <AddIconButton
            size="sm"
            ariaLabel={`Добавить (${title})`}
            onClick={onAddClick}
            className={styles.addBtnInline}
          />
        </div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {currency && (
            <CurrencyDropdown
              current={currency}
              options={currencies ?? [currency]}
              onSelect={onCurrencyChange}
            />
          )}
        </div>
      </div>
      <AddIconButton
        size="lg"
        ariaLabel={`Добавить (${title})`}
        onClick={onAddClick}
        className={styles.addBtnDesktop}
      />
    </div>
  );
}

interface CurrencyDropdownProps {
  current: string;
  options: string[];
  onSelect?: (currency: string) => void;
}

function CurrencyDropdown({ current, options, onSelect }: CurrencyDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const items = options.length > 0 ? options : [current];
  const hasMultiple = items.length > 1;

  return (
    <div className={styles.currencyWrap} ref={rootRef}>
      <button
        type="button"
        className={styles.currency}
        onClick={() => hasMultiple && setOpen((v) => !v)}
        disabled={!hasMultiple}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current}</span>
        <ChevronDownIcon width={16} height={16} color="#383F45" />
      </button>
      {open && hasMultiple && (
        <div className={styles.currencyMenu} role="listbox">
          {items.map((cur) => (
            <button
              key={cur}
              type="button"
              role="option"
              aria-selected={cur === current}
              className={clsx(styles.currencyOption, cur === current && styles.currencyOptionActive)}
              onClick={() => {
                onSelect?.(cur);
                setOpen(false);
              }}
            >
              {cur}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
