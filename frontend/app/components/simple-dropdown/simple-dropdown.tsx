'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './simple-dropdown.module.scss';
import { ChevronDownIcon, SortClearIcon } from '@/components/icons';
import { Button } from '@/components/new-button';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';

interface DropdownItem {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SimpleDropdownProps {
  value: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  items?: DropdownItem[];
  onSelect?: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onClear?: () => void;
}

export default function SimpleDropdown({
  value,
  onClick,
  className,
  ariaLabel,
  items,
  onSelect,
  searchable = false,
  searchPlaceholder = 'Поиск',
  onClear,
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (items?.length) {
      setIsOpen((prev) => !prev);
    }
    onClick?.();
  };

  const handleSelect = (nextValue: string) => {
    onSelect?.(nextValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
  };

  const filteredItems = (items || []).filter((item) => {
    if (!searchable || !searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.value.toLowerCase().includes(query)
    );
  });

  return (
    <div className={classNames(styles.wrapper, className)} ref={rootRef}>
      <button
        type="button"
        className={classNames(styles.root, { [styles.rootOpen]: isOpen })}
        onClick={handleToggle}
        aria-label={ariaLabel}
      >
        <span className={styles.value}>{value}</span>
        <span className={styles.icon} aria-hidden="true">
          <ChevronDownIcon
            className={classNames(styles.chevron, { [styles.chevronOpen]: isOpen })}
            width={14}
            height={14}
            color={isOpen ? '#3B82F6' : '#858585'}
          />
        </span>
      </button>
      {isOpen && items?.length && (
        <div className={styles.menu} role="listbox">
          {searchable && (
            <>
              <div className={styles.searchWrapper}>
                <SearchBar
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  showSearchIcon
                />
              </div>
              <div className={styles.searchLinkWrapper}>
                <Button
                  href="https://www.browserscan.net/timezone"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ width: '100%' }}
                  intent="gradient"
                  className={styles.searchLinkButton}
                >
                  Узнать регион
                </Button>
              </div>
            </>
          )}
          <div className={styles.menuItems}>
            {filteredItems.map((item) => {
              const isSelected = item.label === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={classNames(styles.menuItem, { [styles.menuItemSelected]: isSelected })}
                  onClick={() => handleSelect(item.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                  <span className={styles.itemLabel}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
