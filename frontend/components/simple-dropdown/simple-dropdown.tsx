'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './simple-dropdown.module.scss';
import { ChevronDownIcon } from '@/components/icons';

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
}

export default function SimpleDropdown({
  value,
  onClick,
  className,
  ariaLabel,
  items,
  onSelect,
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
  };

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
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              className={styles.menuItem}
              onClick={() => handleSelect(item.value)}
              role="option"
            >
              {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
              <span className={styles.itemLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
