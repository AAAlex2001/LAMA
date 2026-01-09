'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './dropdown.module.scss';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import Button from '@/components/button/button';
import SearchBar from '@/components/search-bar/search-bar';

interface DropdownOption {
  id: string;
  label: string;
  checked?: boolean;
}

interface DropdownProps {
  label: string;
  placeholder?: string;
  options?: DropdownOption[];
  selectedCount?: number;
  totalCount?: number;
  showSearch?: boolean;
  showCheckboxes?: boolean;
  onOptionChange?: (id: string, checked: boolean) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  className?: string;
}

export default function Dropdown({
  label,
  placeholder = 'Введите название канала',
  options = [],
  selectedCount,
  totalCount,
  showSearch = false,
  showCheckboxes = false,
  onOptionChange,
  onAddNew,
  addNewLabel = 'Подключить новый',
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      ref={dropdownRef}
      className={classNames(styles.dropdown, { [styles.open]: isOpen }, className)}
    >
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.label}>{label}</span>
        <ChevronDownIcon
          width={16}
          height={16}
          className={classNames(styles.chevron, { [styles.rotated]: isOpen })}
        />
      </button>

      {isOpen && (
        <div className={styles.content}>
          {showSearch && (
            <SearchBar
              placeholder={placeholder}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          )}

          <div className={styles.optionsList}>
            {filteredOptions.map((option) => (
              <div key={option.id} className={styles.optionRow}>
                {showCheckboxes ? (
                  <>
                    <Checkbox
                      checked={option.checked || false}
                      onChange={(checked) => onOptionChange?.(option.id, checked)}
                    />
                    <span className={styles.optionLabel}>{option.label}</span>
                  </>
                ) : (
                  <span className={styles.optionLabelGradient}>{option.label}</span>
                )}
              </div>
            ))}
          </div>

          {(onAddNew || (selectedCount !== undefined && totalCount !== undefined)) && (
            <div className={styles.footer}>
              <Button
                text={addNewLabel}
                showArrow={false}
                fullWidth
                onClick={onAddNew}
                counter={selectedCount !== undefined && totalCount !== undefined ? `${selectedCount}/${totalCount}` : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
