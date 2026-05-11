'use client';

import { ReactNode } from 'react';
import { ChevronDownIcon, SortClearIcon } from '@/components/icons';
import styles from '../../drafts.module.scss';

interface Props {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  active: boolean;
  onClear?: () => void;
  menuClassName?: string;
  children: ReactNode;
}

export default function SortDropdown({ label, isOpen, onToggle, active, onClear, menuClassName, children }: Props) {
  return (
    <div className={styles.sortDropdown}>
      <button
        type="button"
        className={active ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
        onClick={onToggle}
      >
        <span className={styles.sortButtonText}>{label}</span>
        <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
        {active && onClear && (
          <span
            className={styles.sortClear}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <SortClearIcon />
          </span>
        )}
      </button>
      {isOpen && (
        <div className={menuClassName ?? styles.sortMenu}>
          {children}
        </div>
      )}
    </div>
  );
}
