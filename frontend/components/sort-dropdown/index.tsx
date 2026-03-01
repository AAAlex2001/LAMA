'use client';

import { FC, useState, useRef, useEffect } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';
import { ChevronDownIcon, SortClearIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import { MobileWrapper, DesktopWrapper } from '@/components/responsive-wrappers';

export interface SortDropdownOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  label?: string;
  options?: SortDropdownOption[];
  selectedValue?: string;
  onSelect?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  defaultOption?: string;
  children?: React.ReactNode;
  menuContent?: React.ReactNode;
  width?: string | number;
}

const SortDropdown: FC<SortDropdownProps> = ({
  label = 'По времени',
  options = [
    { value: 'all', label: 'Все' },
    { value: 'newest', label: 'Сначала новые' },
    { value: 'oldest', label: 'Сначала старые' },
  ],
  selectedValue,
  onSelect,
  onClear,
  className,
  defaultOption = 'all',
  children,
  menuContent,
  width,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (value: string) => {
    onSelect?.(value);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
    setIsOpen(false);
  };

  const isActive = selectedValue && selectedValue !== defaultOption;
  const currentValue = selectedValue || defaultOption;

  return (
    <div
      className={classNames(styles.wrapper, className, {
        [styles.wrapperOpen]: isOpen,
      })}
      ref={rootRef}
      style={isOpen && width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined}
    >
      <button
        type="button"
        className={classNames(styles.button, {
          [styles.buttonActive]: isActive,
          [styles.buttonOpen]: isOpen,
        })}
        onClick={handleToggle}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <span className={styles.buttonText}>{label}</span>
        <div className={styles.buttonRight}>
          <ChevronDownIcon
            className={classNames(styles.chevron, {
              [styles.chevronOpen]: isOpen,
              [styles.chevronActive]: isActive,
            })}
            width={8}
            height={8}
            color={isActive ? '#1A1A1A' : '#383F45'}
            />
            {isActive && onClear && (
              <span
                className={styles.clearButton}
                onClick={handleClear}
                aria-label="Clear selection"
                role="button"
                tabIndex={0}
              >
                <SortClearIcon width={16} height={16} />
              </span>
            )}
        </div>
      </button>

      {isOpen && (
        <>
          <DesktopWrapper>
            <div className={styles.menu} ref={menuRef}>
              <div className={styles.menuItems}>
                {menuContent || children ? (
                  menuContent || children
                ) : (
                  options.map((option) => {
                    const isSelected = currentValue === option.value;
                    return (
                      <div
                        key={option.value}
                        className={styles.menuItem}
                        onClick={() => handleSelect(option.value)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <Checkbox
                          variant="radio"
                          checked={isSelected}
                          onChange={() => handleSelect(option.value)}
                        />
                        <span className={styles.menuItemLabel}>{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </DesktopWrapper>
          <MobileWrapper>
            <div className={classNames(styles.menu, styles.menuMobile)} ref={menuRef}>
              <div className={styles.menuItems}>
                {menuContent || children ? (
                  menuContent || children
                ) : (
                  options.map((option) => {
                    const isSelected = currentValue === option.value;
                    return (
                      <div
                        key={option.value}
                        className={styles.menuItem}
                        onClick={() => handleSelect(option.value)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <Checkbox
                          variant="radio"
                          checked={isSelected}
                          onChange={() => handleSelect(option.value)}
                        />
                        <span className={styles.menuItemLabel}>{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </MobileWrapper>
        </>
      )}
    </div>
  );
};

export default SortDropdown;
