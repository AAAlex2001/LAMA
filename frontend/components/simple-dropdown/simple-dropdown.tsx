'use client';

import classNames from 'classnames';
import styles from './simple-dropdown.module.scss';
import { ChevronDownIcon } from '@/components/icons';

interface SimpleDropdownProps {
  value: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function SimpleDropdown({ value, onClick, className, ariaLabel }: SimpleDropdownProps) {
  return (
    <button
      type="button"
      className={classNames(styles.root, className)}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className={styles.value}>{value}</span>
      <span className={styles.icon} aria-hidden="true">
        <ChevronDownIcon className={styles.chevron} width={10} height={6} color="#858585" />
      </span>
    </button>
  );
}
