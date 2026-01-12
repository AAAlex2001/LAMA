'use client';

import styles from './post-settings.module.scss';
import Dropdown, { type RepeatOption, type AutoDeleteOption, type TagColor } from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CreateChannel from '@/components/create-channel/create-channel';
import type { ChannelOption } from './store';
import type { Tag } from '@/stores/tags';

interface PostSettingsProps {
  className?: string;
  
  // Channels
  channelOptions: ChannelOption[];
  channelsLoading: boolean;
  channelsSyncing: boolean;
  selectedCount: number;
  totalChannels: number;
  onFetchChannels: () => void;
  onChannelChange: (id: string, checked: boolean) => void;
  onAddChannelClick: () => void;
  
  // Tags (чистый UI)
  recentTags: Tag[];
  searchResults: Tag[];
  tagInputValue: string;
  tagsLoading: boolean;
  tagsSearching: boolean;
  onLoadRecentTags: () => void;
  onSearchTags: (query: string) => void;
  onTagInputChange: (value: string) => void;
  onSelectTag: (tag: Tag) => void;
  onDeleteTag: (tagId: number) => void;
  selectedTagColor: TagColor;
  onTagColorChange: (color: TagColor) => void;
  
  // Repeat
  repeatInterval: RepeatOption;
  onRepeatChange: (value: RepeatOption) => void;
  repeatCustomDays: number;
  repeatCustomHours: number;
  onRepeatCustomDaysChange: (value: number) => void;
  onRepeatCustomHoursChange: (value: number) => void;
  
  // Auto-delete
  autoDeleteInterval: AutoDeleteOption;
  onAutoDeleteChange: (value: AutoDeleteOption) => void;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  onAutoDeleteCustomDaysChange: (value: number) => void;
  onAutoDeleteCustomHoursChange: (value: number) => void;
  
  // Toggles
  notifySubscribers: boolean;
  onNotifyChange: (checked: boolean) => void;
  pinPost: boolean;
  onPinChange: (checked: boolean) => void;
  
  // Create channel modal
  showCreateChannel: boolean;
  onAddChannel: (channelLink: string) => void;
  onCloseCreateChannel: () => void;
  
  // Actions
  onPreview?: () => void;
  onReset?: () => void;
}

export default function PostSettings({
  className,
  channelOptions,
  channelsLoading,
  channelsSyncing,
  selectedCount,
  totalChannels,
  onFetchChannels,
  onChannelChange,
  onAddChannelClick,
  recentTags,
  searchResults,
  tagInputValue,
  tagsLoading,
  tagsSearching,
  onLoadRecentTags,
  onSearchTags,
  onTagInputChange,
  onSelectTag,
  onDeleteTag,
  selectedTagColor,
  onTagColorChange,
  repeatInterval,
  onRepeatChange,
  repeatCustomDays,
  repeatCustomHours,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  autoDeleteInterval,
  onAutoDeleteChange,
  autoDeleteCustomDays,
  autoDeleteCustomHours,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,
  notifySubscribers,
  onNotifyChange,
  pinPost,
  onPinChange,
  showCreateChannel,
  onAddChannel,
  onCloseCreateChannel,
  onPreview,
  onReset,
}: PostSettingsProps) {
  return (
    <>
      <div className={`${styles.postSettings} ${className || ''}`}>
        <div className={styles.settingsContent}>
          <div className={styles.title}>Настройки публикации</div>

          <div className={styles.settingsList}>
            <Dropdown
              label="Каналы и чаты для постинга"
              options={channelOptions}
              showSearch
              showCheckboxes
              onOptionChange={onChannelChange}
              onAddNew={onAddChannelClick}
              addNewLabel="Подключить новый"
              selectedCount={selectedCount}
              totalCount={totalChannels}
              variant="channels"
              onOpen={onFetchChannels}
              loading={channelsLoading}
            />

            <Dropdown
              label="Тег поста"
              variant="tags"
              recentTags={recentTags}
              searchResults={searchResults}
              tagInputValue={tagInputValue}
              tagsLoading={tagsLoading}
              tagsSearching={tagsSearching}
              onLoadRecentTags={onLoadRecentTags}
              onSearchTags={onSearchTags}
              onTagInputChange={onTagInputChange}
              onSelectTag={onSelectTag}
              onDeleteTag={onDeleteTag}
              selectedTagColor={selectedTagColor}
              onTagColorChange={onTagColorChange}
            />

            <Dropdown
              label="Автоудаление поста"
              variant="auto-delete"
              autoDeleteValue={autoDeleteInterval}
              onAutoDeleteChange={onAutoDeleteChange}
              autoDeleteCustomDays={autoDeleteCustomDays}
              autoDeleteCustomHours={autoDeleteCustomHours}
              onAutoDeleteCustomDaysChange={onAutoDeleteCustomDaysChange}
              onAutoDeleteCustomHoursChange={onAutoDeleteCustomHoursChange}
            />

            <Dropdown
              label="Повтор"
              variant="repeat"
              repeatValue={repeatInterval}
              onRepeatChange={onRepeatChange}
              repeatCustomDays={repeatCustomDays}
              repeatCustomHours={repeatCustomHours}
              onRepeatCustomDaysChange={onRepeatCustomDaysChange}
              onRepeatCustomHoursChange={onRepeatCustomHoursChange}
            />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
              <Toggle checked={notifySubscribers} onChange={onNotifyChange} />
            </div>

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
              <Toggle checked={pinPost} onChange={onPinChange} />
            </div>
          </div>
        </div>

        <Button
          text="Предпросмотр поста"
          showArrow={false}
          active
          fullWidth
          onClick={onPreview}
        />
        <Button
          text="Сбросить настройки"
          showArrow={false}
          fullWidth
          variant="templateCard"
          onClick={onReset}
          disabled
        />
      </div>

      {showCreateChannel && (
        <div className={styles.modalOverlay} onClick={onCloseCreateChannel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CreateChannel
              onSubmit={onAddChannel}
              onCancel={onCloseCreateChannel}
              loading={channelsSyncing}
            />
          </div>
        </div>
      )}
    </>
  );
}
