'use client';

import { useState, useRef } from 'react';
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

interface Tag {
  id: string;
  label: string;
  color: string;
}

const TAG_COLORS = ['#FAC7C7', '#FDE57E', '#B8F1D2', '#B8DBF1', '#B8B9F1'] as const;

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
  variant?: 'channels' | 'tags';
  tags?: Tag[];
  onAddTag?: (name: string, color: string) => void;
  onSearchTags?: (query: string) => void;
  onOpen?: () => void;
  loading?: boolean;
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
  variant = 'channels',
  tags = [],
  onAddTag,
  onSearchTags,
  onOpen,
  loading = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTagSearch = (query: string) => {
    setTagSearchQuery(query);
    onSearchTags?.(query);
  };

  const handleToggle = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      onOpen?.();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={classNames(styles.dropdown, { [styles.open]: isOpen }, className)}
    >
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
      >
        <span className={styles.label}>{label}</span>
        <ChevronDownIcon
          width={16}
          height={16}
          className={classNames(styles.chevron, { [styles.rotated]: isOpen })}
        />
      </button>

      {isOpen && variant === 'channels' && (
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

      {isOpen && variant === 'tags' && (
        <div className={styles.content}>
          {/* Инпут для названия тега */}
          <div className={styles.tagInputWrapper}>
            <input
              type="text"
              placeholder="Дата"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className={styles.tagInput}
            />
          </div>

          {/* Выберите цвет тега */}
          <span className={styles.colorLabel}>Выберите цвет тега</span>
          <div className={styles.colorPicker}>
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={classNames(styles.colorOption, {
                  [styles.selected]: selectedColor === color,
                })}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>

          {/* Превью тегов */}
          <div className={styles.tagsPreview}>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className={styles.tagPreviewItem}
                style={{ backgroundColor: tag.color }}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* Поиск по тегам */}
          <SearchBar
            placeholder="Введите название тега"
            value={tagSearchQuery}
            onChange={handleTagSearch}
          />
        </div>
      )}
    </div>
  );
}

