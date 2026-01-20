'use client';

import styles from './post-settings.module.scss';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CreateChannel from '@/components/create-channel/create-channel';
import { usePostSettingsContext } from './store/PostSettingsContext';

interface PostSettingsProps {
  className?: string;
  onPreview?: () => void;
  previewDisabled?: boolean;
}

export default function PostSettings({ className, onPreview, previewDisabled }: PostSettingsProps) {
  const {
    // Channels
    channelOptions,
    channelsLoading,
    channelsSyncing,
    selectedCount,
    totalChannels,
    fetchChannels,
    handleChannelChange,
    handleAddChannel,
    openCreateChannel,
    closeCreateChannel,
    showCreateChannel,
    // Tags
    recentTags,
    searchResults,
    searchQuery,
    tagInputValue,
    selectedTagName,
    tagsLoading,
    tagsSearching,
    loadRecentTags,
    searchTags,
    setSearchQuery,
    setTagInputValue,
    selectTag,
    deleteTag,
    selectedTagColor,
    handleTagColorChange,
    // Repeat
    repeatInterval,
    handleRepeatChange,
    repeatCustomDays,
    repeatCustomHours,
    handleRepeatCustomDaysChange,
    handleRepeatCustomHoursChange,
    // Auto-delete
    autoDeleteInterval,
    handleAutoDeleteChange,
    autoDeleteCustomDays,
    autoDeleteCustomHours,
    handleAutoDeleteCustomDaysChange,
    handleAutoDeleteCustomHoursChange,
    // Toggles
    notifySubscribers,
    handleNotifyChange,
    pinPost,
    handlePinChange,
    // Reset
    resetSettings,
  } = usePostSettingsContext();

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
              onOptionChange={handleChannelChange}
              onAddNew={openCreateChannel}
              addNewLabel="Подключить новый"
              selectedCount={selectedCount}
              totalCount={totalChannels}
              variant="channels"
              onOpen={fetchChannels}
              loading={channelsLoading}
            />

            <Dropdown
              label="Тег поста"
              variant="tags"
              recentTags={recentTags}
              searchResults={searchResults}
              tagInputValue={tagInputValue}
              selectedTagName={selectedTagName}
              tagsLoading={tagsLoading}
              tagsSearching={tagsSearching}
              onLoadRecentTags={loadRecentTags}
              onSearchTags={searchTags}
              onTagInputChange={setTagInputValue}
              onSelectTag={selectTag}
              onDeleteTag={deleteTag}
              selectedTagColor={selectedTagColor}
              onTagColorChange={handleTagColorChange}
            />

            <Dropdown
              label="Автоудаление поста"
              variant="auto-delete"
              autoDeleteValue={autoDeleteInterval}
              onAutoDeleteChange={handleAutoDeleteChange}
              autoDeleteCustomDays={autoDeleteCustomDays}
              autoDeleteCustomHours={autoDeleteCustomHours}
              onAutoDeleteCustomDaysChange={handleAutoDeleteCustomDaysChange}
              onAutoDeleteCustomHoursChange={handleAutoDeleteCustomHoursChange}
            />

            <Dropdown
              label="Повтор"
              variant="repeat"
              repeatValue={repeatInterval}
              onRepeatChange={handleRepeatChange}
              repeatCustomDays={repeatCustomDays}
              repeatCustomHours={repeatCustomHours}
              onRepeatCustomDaysChange={handleRepeatCustomDaysChange}
              onRepeatCustomHoursChange={handleRepeatCustomHoursChange}
            />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
              <Toggle checked={notifySubscribers} onChange={handleNotifyChange} />
            </div>

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
              <Toggle checked={pinPost} onChange={handlePinChange} />
            </div>
          </div>
        </div>

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
          onClick={resetSettings}
          disabled
        />
      </div>

      {showCreateChannel && (
        <div className={styles.modalOverlay} onClick={closeCreateChannel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CreateChannel
              onSubmit={handleAddChannel}
              onCancel={closeCreateChannel}
              loading={channelsSyncing}
            />
          </div>
        </div>
      )}
    </>
  );
}
