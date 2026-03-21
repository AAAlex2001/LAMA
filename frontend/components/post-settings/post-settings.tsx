'use client';

import { useState } from 'react';
import styles from './post-settings.module.scss';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import ConnectChannelModal from '@/components/connect-channel-modal';

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
  members_count?: number;
  photo_url?: string;
}


interface PostSettingsProps {
  className?: string;
  onPreview?: () => void;
  previewDisabled?: boolean;

  // Channels
  channelOptions: ChannelOption[];
  channelsLoading: boolean;
  selectedCount: number;
  totalChannels: number;
  showCreateChannel: boolean;
  onFetchChannels: () => void;
  onChannelChange: (id: string, checked: boolean) => void;
  onOpenCreateChannel: () => void;
  onCloseCreateChannel: () => void;
  onChannelAdded?: () => void;

  // Repeat
  repeatInterval: RepeatOption;
  repeatPublishTimeType: 'from_publish' | 'exact_time';
  repeatPublishHours: number;
  repeatPublishMinutes: number;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
  repeatEndType: 'never' | 'date';
  repeatEndDate: Date | null;
  scheduledPostDate?: Date | null;
  onRepeatChange: (value: RepeatOption) => void;
  onRepeatPublishTimeTypeChange: (value: 'from_publish' | 'exact_time') => void;
  onRepeatPublishHoursChange: (value: number) => void;
  onRepeatPublishMinutesChange: (value: number) => void;
  onRepeatCustomDaysChange: (value: number) => void;
  onRepeatCustomHoursChange: (value: number) => void;
  onRepeatCustomUnitChange: (value: RepeatCustomUnit) => void;
  onRepeatCustomValueChange: (value: number) => void;
  onRepeatWeekdaysChange: (value: number[]) => void;
  onRepeatMonthDaysChange: (value: number[]) => void;
  onRepeatYearMonthChange: (value: number) => void;
  onRepeatYearDaysChange: (value: number[]) => void;
  onRepeatEndTypeChange: (value: 'never' | 'date') => void;
  onRepeatEndDateChange: (value: Date | null) => void;

  // Auto-delete
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  onAutoDeleteChange: (value: AutoDeleteOption) => void;
  onAutoDeleteCustomDaysChange: (value: number) => void;
  onAutoDeleteCustomHoursChange: (value: number) => void;

  // Toggles
  notifySubscribers: boolean;
  pinPost: boolean;
  onNotifyChange: (checked: boolean) => void;
  onPinChange: (checked: boolean) => void;

  // Reset
  onReset: () => void;
}

export default function PostSettings({
  className,
  onPreview,
  previewDisabled,

  channelOptions,
  channelsLoading,
  selectedCount,
  totalChannels,
  showCreateChannel,
  onFetchChannels,
  onChannelChange,
  onOpenCreateChannel,
  onCloseCreateChannel,
  onChannelAdded,

  repeatInterval,
  repeatPublishTimeType,
  repeatPublishHours,
  repeatPublishMinutes,
  repeatCustomDays,
  repeatCustomHours,
  repeatCustomUnit,
  repeatCustomValue,
  repeatWeekdays,
  repeatMonthDays,
  repeatYearMonth,
  repeatYearDays,
  repeatEndType,
  repeatEndDate,
  scheduledPostDate,
  onRepeatChange,
  onRepeatPublishTimeTypeChange,
  onRepeatPublishHoursChange,
  onRepeatPublishMinutesChange,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  onRepeatCustomUnitChange,
  onRepeatCustomValueChange,
  onRepeatWeekdaysChange,
  onRepeatMonthDaysChange,
  onRepeatYearMonthChange,
  onRepeatYearDaysChange,
  onRepeatEndTypeChange,
  onRepeatEndDateChange,

  autoDeleteInterval,
  autoDeleteCustomDays,
  autoDeleteCustomHours,
  onAutoDeleteChange,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,

  notifySubscribers,
  pinPost,
  onNotifyChange,
  onPinChange,

  onReset,
}: PostSettingsProps) {
  // Состояние для аккордеона (какой dropdown открыт)
  // По умолчанию открыты каналы/чаты
  const [openDropdown, setOpenDropdown] = useState<string | null>('channels');

  return (
    <>
      <div className={`${styles.postSettings} ${className || ''}`}>
        <div className={styles.settingsContent}>
          <div className={styles.title}>Настройки публикации</div>

          <div className={styles.settingsList}>
            {/* Каналы - всегда открыты */}
            <Dropdown
              label="Каналы и чаты для постинга"
              options={channelOptions}
              showSearch
              showCheckboxes
              onOptionChange={onChannelChange}
              onAddNew={onOpenCreateChannel}
              addNewLabel="Подключить новый"
              selectedCount={selectedCount}
              totalCount={totalChannels}
              variant="channels"
              onOpen={onFetchChannels}
              loading={channelsLoading}
              isOpen={openDropdown === 'channels'}
              onToggle={(willOpen) => setOpenDropdown(willOpen ? 'channels' : null)}
            />

            {/* Автоудаление */}
            <Dropdown
              label="Автоудаление поста"
              variant="auto-delete"
              autoDeleteValue={autoDeleteInterval}
              onAutoDeleteChange={onAutoDeleteChange}
              autoDeleteCustomDays={autoDeleteCustomDays}
              autoDeleteCustomHours={autoDeleteCustomHours}
              onAutoDeleteCustomDaysChange={onAutoDeleteCustomDaysChange}
              onAutoDeleteCustomHoursChange={onAutoDeleteCustomHoursChange}
              isOpen={openDropdown === 'auto-delete'}
              onToggle={(willOpen) => setOpenDropdown(willOpen ? 'auto-delete' : null)}
            />

            {/* Повтор */}
            <Dropdown
              label="Повтор"
              variant="repeat"
              repeatValue={repeatInterval}
              repeatPublishTimeType={repeatPublishTimeType}
              repeatPublishHours={repeatPublishHours}
              repeatPublishMinutes={repeatPublishMinutes}
              onRepeatChange={onRepeatChange}
              onRepeatPublishTimeTypeChange={onRepeatPublishTimeTypeChange}
              onRepeatPublishHoursChange={onRepeatPublishHoursChange}
              onRepeatPublishMinutesChange={onRepeatPublishMinutesChange}
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
              scheduledMinDate={scheduledPostDate}
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
              isOpen={openDropdown === 'repeat'}
              onToggle={(willOpen) => setOpenDropdown(willOpen ? 'repeat' : null)}
            />

          </div>
        </div>

        <div className={styles.settingsBottom}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
            <Toggle checked={notifySubscribers} onChange={onNotifyChange} />
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
            <Toggle checked={pinPost} onChange={onPinChange} />
          </div>

          <div className={styles.settingsButtons}>
            <Button
              text="Предпросмотр поста"
              showArrow={false}
              active
              fullWidth
              onClick={onPreview}
              disabled={previewDisabled}
            />
            <Button
              text="Сбросить настройки"
              showArrow={false}
              fullWidth
              variant="templateCard"
              onClick={onReset}
            />
          </div>
        </div>
      </div>

      {/* Модалка добавления канала */}
      <ConnectChannelModal
        isOpen={showCreateChannel}
        onOpenChange={(open) => { if (!open) onCloseCreateChannel(); }}
        onSuccess={onChannelAdded}
      />
    </>
  );
}
