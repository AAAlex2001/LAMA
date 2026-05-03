'use client';

import ChevronDownIcon from '@/components/icons/chevron-down-icon';
import styles from './SortBar.module.scss';

interface SortBarProps {
  options: string[];
  onSelect?: (option: string) => void;
}

export default function SortBar({ options, onSelect }: SortBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>Сортировка:</span>
      <div className={styles.chips}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.chip}
            onClick={() => onSelect?.(option)}
          >
            <span>{option}</span>
            <ChevronDownIcon width={16} height={16} color="#1E1E1E" />
          </button>
        ))}
      </div>
    </div>
  );
}
