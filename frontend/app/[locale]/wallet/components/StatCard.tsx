'use client';

import { ReactNode } from 'react';
import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import AddIconButton from './AddIconButton';
import styles from './StatCard.module.scss';

interface StatCardProps {
  title: string;
  value: ReactNode;
  currency?: string;
  onAddClick?: () => void;
  onCurrencyClick?: () => void;
}

export default function StatCard({ title, value, currency, onAddClick, onCurrencyClick }: StatCardProps) {
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
            <button type="button" className={styles.currency} onClick={onCurrencyClick}>
              <span>{currency}</span>
              <ChevronDownIcon width={16} height={16} color="#383F45" />
            </button>
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
