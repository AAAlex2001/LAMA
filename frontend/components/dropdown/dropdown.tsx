'use client';

import { useState, useRef } from 'react';
import styles from './dropdown.module.scss';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import Button from '@/components/button/button';
import SearchBar from '@/components/search-bar/search-bar';
import Input from '@/components/input';
import TimeDurationPicker from '@/components/time-duration-picker';
import Loader from '@/components/loader';
import TagCloseIcon from '@/components/icons/tag-close-icon';

interface DropdownOption {
  id: string;
  label: string;
  checked?: boolean;
}

interface ApiTag {
  id: number;
  name: string;
  created_at: string;
  color?: string;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';
export type ButtonTypeOption = 'url' | 'hidden_text' | 'callback';

export const TAG_COLORS: TagColor[] = ['#FAC7C7', '#FDE57E', '#B8F1D2', '#B8DBF1', '#B8B9F1'];

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
  variant?: 'channels' | 'tags' | 'repeat' | 'auto-delete' | 'button-type';
  recentTags?: ApiTag[];
  searchResults?: ApiTag[];
  tagInputValue?: string;
  onTagInputChange?: (value: string) => void;
  onSelectTag?: (tag: ApiTag) => void;
  onSearchTags?: (query: string) => void;
  onLoadRecentTags?: () => void;
  onDeleteTag?: (tagId: number) => void;
  tagsLoading?: boolean;
  tagsSearching?: boolean;
  selectedTagColor?: TagColor;
  onTagColorChange?: (color: TagColor) => void;
  repeatValue?: RepeatOption;
  onRepeatChange?: (value: RepeatOption) => void;
  repeatCustomDays?: number;
  repeatCustomHours?: number;
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
  autoDeleteValue?: AutoDeleteOption;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  autoDeleteCustomDays?: number;
  autoDeleteCustomHours?: number;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
  onOpen?: () => void;
  loading?: boolean;
  buttonTypeValue?: ButtonTypeOption;
  onButtonTypeChange?: (value: ButtonTypeOption) => void;
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
  recentTags = [],
  searchResults = [],
  tagInputValue = '',
  onTagInputChange,
  onSelectTag,
  onSearchTags,
  onLoadRecentTags,
  onDeleteTag,
  tagsLoading = false,
  tagsSearching = false,
  selectedTagColor = '#FAC7C7',
  onTagColorChange,
  repeatValue = 'never',
  onRepeatChange,
  repeatCustomDays = 0,
  repeatCustomHours = 0,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  autoDeleteValue = 'never',
  onAutoDeleteChange,
  autoDeleteCustomDays = 0,
  autoDeleteCustomHours = 0,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,
  onOpen,
  loading = false,
  buttonTypeValue = 'url',
  onButtonTypeChange,
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
            {loading ? (
              <div className={styles.loadingContainer}>
                <Loader size={24} color="blue" />
              </div>
            ) : (
              filteredOptions.map((option) => (
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
              ))
            )}
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

          {/* Выбор цвета тега */}
          <div className={styles.colorPickerSection}>
            <span className={styles.colorPickerLabel}>Выберите цвет тега</span>
            <div className={styles.colorButtons}>
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={classNames(styles.colorButton, {
                    [styles.colorButtonSelected]: selectedTagColor === color,
                  })}
                  style={{ backgroundColor: color }}
                  onClick={() => onTagColorChange?.(color)}
                />
              ))}
            </div>
          </div>

          {/* Недавние теги */}
          {recentTags.length > 0 && (
            <>
              <span className={styles.recentTagsLabel}>Недавние теги</span>
              <div className={styles.tagsPreview}>
                {recentTags.slice(0, 6).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={classNames(styles.tagPreviewItem, {
                      [styles.tagSelected]: tagInputValue === tag.name,
                    })}
                    style={{ backgroundColor: tag.color || '#FAC7C7' }}
                    onClick={() => handleSelectTag(tag)}
                  >
                    <span className={styles.tagText} title={tag.name}>
                      {tag.name}
                    </span>
                    {onDeleteTag && (
                      <span 
                        className={styles.tagDeleteIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTag(tag.id);
                        }}
                      >
                        <TagCloseIcon width={12} height={12} color="#383F45" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Лоадер при загрузке тегов */}
          {tagsLoading && (
            <div className={styles.loadingContainer}>
              <Loader size={24} color="blue" />
            </div>
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
                  <span className={styles.tagText} title={tag.name}>
                    {tag.name}
                  </span>
                </button>
              ))}
            </div>
          )}
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

          {repeatValue === 'custom' && (
            <TimeDurationPicker
              days={repeatCustomDays}
              hours={repeatCustomHours}
              onDaysChange={(val) => onRepeatCustomDaysChange?.(val)}
              onHoursChange={(val) => onRepeatCustomHoursChange?.(val)}
              maxDays={365}
            />
          )}
        </div>
      )}

      {isOpen && variant === 'auto-delete' && (
        <div className={styles.content}>
          <span className={styles.deleteLabel}>Удалить через:</span>
          <div className={styles.repeatList}>
            {([
              { id: 'never', label: 'Никогда' },
              { id: '24h', label: '24 часа' },
              { id: '48h', label: '48 часов' },
              { id: '72h', label: '72 часа' },
              { id: 'custom', label: 'Другой вариант' },
            ] as { id: AutoDeleteOption; label: string }[]).map((option) => (
              <div key={option.id} className={styles.repeatRow}>
                <Checkbox
                  variant="radio"
                  checked={autoDeleteValue === option.id}
                  onChange={() => onAutoDeleteChange?.(option.id)}
                />
                <span className={styles.optionLabel}>{option.label}</span>
              </div>
            ))}
          </div>

          {autoDeleteValue === 'custom' && (
            <TimeDurationPicker
              days={autoDeleteCustomDays}
              hours={autoDeleteCustomHours}
              onDaysChange={(val) => onAutoDeleteCustomDaysChange?.(val)}
              onHoursChange={(val) => onAutoDeleteCustomHoursChange?.(val)}
              maxDays={365}
            />
          )}
        </div>
      )}

      {isOpen && variant === 'button-type' && (
        <div className={styles.content}>
          <div className={styles.repeatList}>
            {([
              { id: 'url', label: 'URL' },
              { id: 'hidden_text', label: 'Скрытый текст' },
              { id: 'callback', label: 'Callback' },
            ] as { id: ButtonTypeOption; label: string }[]).map((option) => (
              <div key={option.id} className={styles.repeatRow}>
                <Checkbox
                  variant="radio"
                  checked={buttonTypeValue === option.id}
                  onChange={() => onButtonTypeChange?.(option.id)}
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

