'use client';

import { useState, useRef } from 'react';
import styles from './dropdown.module.scss';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import Button from '@/components/button/button';
import SearchBar from '@/components/search-bar/search-bar';
import Input from '@/components/input';

interface DropdownOption {
  id: string;
  label: string;
  checked?: boolean;
}

// Тег из API
interface ApiTag {
  id: number;
  name: string;
  created_at: string;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

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
  variant?: 'channels' | 'tags' | 'repeat';
  // Tags props (чистый UI - только отображение и выбор)
  recentTags?: ApiTag[];
  searchResults?: ApiTag[];
  tagInputValue?: string;
  onTagInputChange?: (value: string) => void;
  onSelectTag?: (tag: ApiTag) => void;
  onSearchTags?: (query: string) => void;
  onLoadRecentTags?: () => void;
  tagsLoading?: boolean;
  tagsSearching?: boolean;
  repeatValue?: RepeatOption;
  onRepeatChange?: (value: RepeatOption) => void;
  // General
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
  // Tags
  recentTags = [],
  searchResults = [],
  tagInputValue = '',
  onTagInputChange,
  onSelectTag,
  onSearchTags,
  onLoadRecentTags,
  tagsLoading = false,
  tagsSearching = false,
  repeatValue = 'never',
  onRepeatChange,
  // General
  onOpen,
  loading = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      // Для тегов загружаем недавние при открытии
      if (variant === 'tags') {
        onLoadRecentTags?.();
      }
    }
  };

  const handleSelectTag = (tag: ApiTag) => {
    onTagInputChange?.(tag.name);
    onSelectTag?.(tag);
    setTagSearchQuery('');
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
          {/* Инпут для ввода названия тега */}
          <div className={styles.tagInputWrapper}>
            <Input
              placeholder="Введите название тега"
              value={tagInputValue}
              onChange={(value) => onTagInputChange?.(value)}
            />
          </div>

          {/* Недавние теги */}
          {recentTags.length > 0 && (
            <>
              <span className={styles.recentTagsLabel}>Недавние теги</span>
              <div className={styles.tagsPreview}>
                {recentTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={classNames(styles.tagPreviewItem, {
                      [styles.tagSelected]: tagInputValue === tag.name,
                    })}
                    onClick={() => handleSelectTag(tag)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Поиск по тегам */}
          <SearchBar
            placeholder="Поиск по тегам"
            value={tagSearchQuery}
            onChange={handleTagSearch}
          />

          {/* Результаты поиска */}
          {tagSearchQuery && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={styles.searchResultItem}
                  onClick={() => handleSelectTag(tag)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {tagsSearching && <div className={styles.loadingText}>Поиск...</div>}
          {tagsLoading && <div className={styles.loadingText}>Загрузка...</div>}
        </div>
      )}

      {isOpen && variant === 'repeat' && (
        <div className={styles.content}>
          <div className={styles.repeatList}>
            {([
              { id: 'never', label: 'Никогда' },
              { id: 'daily', label: 'Каждый день' },
              { id: 'weekly', label: 'Каждую неделю' },
              { id: 'biweekly', label: 'Каждые 2 недели' },
              { id: 'monthly', label: 'Каждый месяц' },
              { id: 'yearly', label: 'Каждый год' },
              { id: 'custom', label: 'Другой вариант' },
            ] as { id: RepeatOption; label: string }[]).map((option) => (
              <div key={option.id} className={styles.repeatRow}>
                <Checkbox
                  variant="radio"
                  checked={repeatValue === option.id}
                  onChange={() => onRepeatChange?.(option.id)}
                />
                <span className={styles.optionLabel}>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

