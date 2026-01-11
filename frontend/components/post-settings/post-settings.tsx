'use client';

import styles from './post-settings.module.scss';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CreateChannel from '@/components/create-channel/create-channel';
import type { Tag, ChannelOption } from './store';

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
  
  // Tags
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  
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
  tags,
  onAddTag,
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
              tags={tags}
              onAddTag={onAddTag}
            />

            <Dropdown label="Автоудаление поста" />

            <Dropdown label="Повтор" />

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
