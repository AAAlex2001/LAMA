'use client';

import { useState } from 'react';
import styles from './search-bar.module.scss';
import classNames from 'classnames';
import { SearchIcon } from '@/components/icons';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  className?: string;
  showSearchIcon?: boolean;
}

export default function SearchBar({
  placeholder = 'Введите название канала',
  value,
  onChange,
  onFocus,
  className,
  showSearchIcon = true,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div className={classNames(styles.searchBar, className)}>
      <input
        type="text"
        placeholder={placeholder}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={onFocus}
        className={styles.searchInput}
      />
      {showSearchIcon && <SearchIcon width={18} height={18} />}
    </div>
  );
}
