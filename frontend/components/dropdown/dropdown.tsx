'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './base.module.scss';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';

import { ChannelsContent } from './variants/channels';
import { TagsContent } from './variants/tags';
import { RepeatContent, type RepeatViewMode } from './variants/repeat';
import { AutoDeleteContent } from './variants/auto-delete';
import { ButtonTypeContent } from './variants/button-type';

import type {
  RepeatOption,
  AutoDeleteOption,
  TagColor,
  ButtonTypeOption,
  DropdownProps,
} from './types';

export type { RepeatOption, AutoDeleteOption, TagColor, ButtonTypeOption };
export { TAG_COLORS} from './types';

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
  repeatPublishTimeType = 'from_publish',
  repeatPublishHours = 12,
  repeatPublishMinutes = 0,
  onRepeatChange,
  onRepeatPublishTimeTypeChange,
  onRepeatPublishHoursChange,
  onRepeatPublishMinutesChange,
  repeatCustomDays = 0,
  repeatCustomHours = 0,
  repeatCustomUnit = 'days',
  repeatCustomValue = 1,
  repeatWeekdays = [],
  repeatMonthDays = [],
  repeatYearMonth = 0,
  repeatYearDays = [],
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  onRepeatCustomUnitChange,
  onRepeatCustomValueChange,
  onRepeatWeekdaysChange,
  onRepeatMonthDaysChange,
  onRepeatYearMonthChange,
  onRepeatYearDaysChange,
  repeatEndType = 'never',
  repeatEndDate = null,
  onRepeatEndTypeChange,
  onRepeatEndDateChange,
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
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: DropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [repeatViewMode, setRepeatViewMode] = useState<RepeatViewMode>('list');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repeatValue === 'never') {
      setRepeatViewMode('list');
    }
  }, [repeatValue]);

  // Используем контролируемое состояние если передано, иначе внутреннее
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const willOpen = !isOpen;
    
    // Если есть внешний контроль - используем его
    if (controlledOnToggle) {
      controlledOnToggle(willOpen);
    } else {
      setInternalIsOpen(willOpen);
    }
    
    if (willOpen) {
      onOpen?.();
      if (variant === 'tags') {
        onLoadRecentTags?.();
      }
    } else {
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
            repeatPublishTimeType={repeatPublishTimeType}
            repeatPublishHours={repeatPublishHours}
            repeatPublishMinutes={repeatPublishMinutes}
            repeatCustomDays={repeatCustomDays}
            repeatCustomHours={repeatCustomHours}
            repeatCustomUnit={repeatCustomUnit}
            repeatCustomValue={repeatCustomValue}
            repeatWeekdays={repeatWeekdays}
            repeatMonthDays={repeatMonthDays}
            repeatYearMonth={repeatYearMonth}
            repeatYearDays={repeatYearDays}
            repeatEndType={repeatEndType}
            repeatEndDate={repeatEndDate}
            onRepeatChange={onRepeatChange}
            onRepeatPublishTimeTypeChange={onRepeatPublishTimeTypeChange}
            onRepeatPublishHoursChange={onRepeatPublishHoursChange}
            onRepeatPublishMinutesChange={onRepeatPublishMinutesChange}
            onRepeatCustomDaysChange={onRepeatCustomDaysChange}
            onRepeatCustomHoursChange={onRepeatCustomHoursChange}
            onRepeatCustomUnitChange={onRepeatCustomUnitChange}
            onRepeatCustomValueChange={onRepeatCustomValueChange}
            onRepeatWeekdaysChange={onRepeatWeekdaysChange}
            onRepeatMonthDaysChange={onRepeatMonthDaysChange}
            onRepeatYearMonthChange={onRepeatYearMonthChange}
            onRepeatYearDaysChange={onRepeatYearDaysChange}
            onRepeatEndTypeChange={onRepeatEndTypeChange}
            onRepeatEndDateChange={onRepeatEndDateChange}
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
      <div
        className={styles.header}
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
      >
        <span className={styles.label}>{label}</span>
        <div className={styles.headerRight}>
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

