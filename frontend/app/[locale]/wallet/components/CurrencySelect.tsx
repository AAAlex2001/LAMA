'use client';

import { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import styles from './CurrencySelect.module.scss';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'RUB', label: 'РУБ' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CurrencySelect({ value, onChange, className }: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div ref={ref} className={classnames(styles.wrapper, className)}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.label}>{current.label}</span>
        <span className={classnames(styles.chevron, { [styles.chevronOpen]: open })}>
          <ChevronDownIcon width={16} height={16} color="#383F45" />
        </span>
      </button>
      {open && (
        <div className={styles.menu}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={classnames(styles.option, {
                [styles.optionActive]: opt.value === value,
              })}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
