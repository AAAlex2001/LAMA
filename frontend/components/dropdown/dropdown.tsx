'use client';

import { useState, useRef } from 'react';
import styles from './base.module.scss';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';
import Button from '@/components/button/button';

import { ChannelsContent } from './variants/channels';
import { TagsContent } from './variants/tags';
import { RepeatContent, type RepeatViewMode } from './variants/repeat';
import { AutoDeleteContent } from './variants/auto-delete';
import { ButtonTypeContent } from './variants/button-type';

import type {
  DropdownOption,
  ApiTag,
  RepeatOption,
  AutoDeleteOption,
  TagColor,
  ButtonTypeOption,
} from './types';

// Re-export types for backward compatibility
export type { RepeatOption, AutoDeleteOption, TagColor, ButtonTypeOption };
export { TAG_COLORS } from './types';

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
  // Tags props
  recentTags?: ApiTag[];
  searchResults?: ApiTag[];
  tagInputValue?: string;
  selectedTagName?: string;
  onTagInputChange?: (value: string) => void;
  onSelectTag?: (tag: ApiTag) => void;
  onSearchTags?: (query: string) => void;
  onLoadRecentTags?: () => void;
  onDeleteTag?: (tagId: number) => void;
  tagsLoading?: boolean;
  tagsSearching?: boolean;
  selectedTagColor?: TagColor;
  onTagColorChange?: (color: TagColor) => void;
  // Repeat props
  repeatValue?: RepeatOption;
  onRepeatChange?: (value: RepeatOption) => void;
  repeatCustomDays?: number;
  repeatCustomHours?: number;
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
  // Auto-delete props
  autoDeleteValue?: AutoDeleteOption;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  autoDeleteCustomDays?: number;
  autoDeleteCustomHours?: number;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
  // Common props
  onOpen?: () => void;
  loading?: boolean;
  // Button type props
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
  selectedTagName = '',
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
  const [repeatViewMode, setRepeatViewMode] = useState<RepeatViewMode>('list');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      onOpen?.();
      if (variant === 'tags') {
        onLoadRecentTags?.();
      }
    } else {
      // Reset view mode when closing
      setRepeatViewMode('list');
    }
  };

  const renderContent = () => {
    switch (variant) {
      case 'channels':
        return (
          <ChannelsContent
            options={options}
            showSearch={showSearch}
            showCheckboxes={showCheckboxes}
            placeholder={placeholder}
            loading={loading}
            selectedCount={selectedCount}
            totalCount={totalCount}
            addNewLabel={addNewLabel}
            onOptionChange={onOptionChange}
            onAddNew={onAddNew}
          />
        );

      case 'tags':
        return (
          <TagsContent
            recentTags={recentTags}
            searchResults={searchResults}
            tagInputValue={tagInputValue}
            selectedTagName={selectedTagName}
            tagsLoading={tagsLoading}
            tagsSearching={tagsSearching}
            selectedTagColor={selectedTagColor}
            onTagInputChange={onTagInputChange}
            onSelectTag={onSelectTag}
            onSearchTags={onSearchTags}
            onLoadRecentTags={onLoadRecentTags}
            onDeleteTag={onDeleteTag}
            onTagColorChange={onTagColorChange}
          />
        );

      case 'repeat':
        return (
          <RepeatContent
            repeatValue={repeatValue}
            repeatCustomDays={repeatCustomDays}
            repeatCustomHours={repeatCustomHours}
            onRepeatChange={onRepeatChange}
            onRepeatCustomDaysChange={onRepeatCustomDaysChange}
            onRepeatCustomHoursChange={onRepeatCustomHoursChange}
            viewMode={repeatViewMode}
            onViewModeChange={setRepeatViewMode}
          />
        );

      case 'auto-delete':
        return (
          <AutoDeleteContent
            autoDeleteValue={autoDeleteValue}
            autoDeleteCustomDays={autoDeleteCustomDays}
            autoDeleteCustomHours={autoDeleteCustomHours}
            onAutoDeleteChange={onAutoDeleteChange}
            onAutoDeleteCustomDaysChange={onAutoDeleteCustomDaysChange}
            onAutoDeleteCustomHoursChange={onAutoDeleteCustomHoursChange}
          />
        );

      case 'button-type':
        return (
          <ButtonTypeContent
            buttonTypeValue={buttonTypeValue}
            onButtonTypeChange={onButtonTypeChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={classNames(styles.dropdown, { [styles.open]: isOpen }, className)}
    >
      <div className={styles.header} onClick={handleToggle}>
        <span className={styles.label}>{label}</span>
        <div className={styles.headerRight}>
          {variant === 'repeat' && isOpen && repeatViewMode === 'daily' && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                text="Назад"
                showArrow={false}
                size="small"
                onClick={() => {
                  onRepeatChange?.('never');
                  setRepeatViewMode('list');
                }}
              />
            </div>
          )}
          <ChevronDownIcon
            width={16}
            height={16}
            className={classNames(styles.chevron, { [styles.rotated]: isOpen })}
          />
        </div>
      </div>

      {isOpen && <div className={styles.content}>{renderContent()}</div>}
    </div>
  );
}

