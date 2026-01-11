'use client';

import { useState, useEffect } from 'react';
import styles from './post-settings.module.scss';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CreateChannel from '@/components/create-channel/create-channel';
import { useChannels } from '@/stores/channels';

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface PostSettingsProps {
  className?: string;
  onSettingsChange?: (settings: {
    channelIds: number[];
    notifySubscribers: boolean;
    pinPost: boolean;
    tags: Tag[];
  }) => void;
}

export default function PostSettings({ className, onSettingsChange }: PostSettingsProps) {
  const {
    channels,
    loading,
    syncing,
    error,
    selectedCount,
    fetchChannels,
    addChannel,
    toggleChannelSelected,
    clearError,
  } = useChannels();

  const [tags, setTags] = useState<Tag[]>([
    { id: '1', label: 'Срочно', color: '#FAC7C7' },
    { id: '2', label: 'Важно', color: '#B8F1D2' },
    { id: '3', label: 'Дата', color: '#FDE57E' },
  ]);

  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [pinPost, setPinPost] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Уведомляем родителя об изменениях
  useEffect(() => {
    if (onSettingsChange) {
      const selectedChannelIds = channels
        .filter((ch) => ch.selected)
        .map((ch) => ch.id);
      
      onSettingsChange({
        channelIds: selectedChannelIds,
        notifySubscribers,
        pinPost,
        tags,
      });
    }
  }, [channels, notifySubscribers, pinPost, tags, onSettingsChange]);

  const handleChannelChange = (id: string, checked: boolean) => {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      toggleChannelSelected(numericId);
    }
  };

  const handleAddChannel = async (channelLink: string) => {
    const success = await addChannel(channelLink);
    if (success) {
      setShowCreateChannel(false);
    }
  };

  const handleAddTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: String(Date.now()),
      label: name,
      color,
    };
    setTags((prev) => [...prev, newTag]);
  };

  const handleSearchTags = (query: string) => {
    console.log('Search tags:', query);
  };

  const handleNotifyChange = (checked: boolean) => {
    setNotifySubscribers(checked);
  };

  const handlePinChange = (checked: boolean) => {
    setPinPost(checked);
  };

  return (
    <>
      <div className={`${styles.postSettings} ${className || ''}`}>
        <div className={styles.settingsContent}>
          <div className={styles.title}>Настройки публикации</div>

          <div className={styles.settingsList}>
            <Dropdown
              label="Каналы и чаты для постинга"
              options={channels.map((ch) => ({
                id: String(ch.id),
                label: ch.title,
                checked: ch.selected,
              }))}
              showSearch
              showCheckboxes
              onOptionChange={handleChannelChange}
              onAddNew={() => setShowCreateChannel(true)}
              addNewLabel="Подключить новый"
              selectedCount={selectedCount}
              totalCount={channels.length}
              variant="channels"
              onOpen={fetchChannels}
              loading={loading}
            />

            <Dropdown 
              label="Тег поста"
              variant="tags"
              tags={tags}
              onAddTag={handleAddTag}
              onSearchTags={handleSearchTags}
            />

            {/* Автоудаление поста */}
            <Dropdown label="Автоудаление поста" />

            {/* Повтор */}
            <Dropdown label="Повтор" />

            {/* Уведомлять подписчиков */}
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
              <Toggle checked={notifySubscribers} onChange={handleNotifyChange} />
            </div>

            {/* Закрепить пост после публикации */}
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
              <Toggle checked={pinPost} onChange={handlePinChange} />
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <Button
          text="Предпросмотр поста"
          showArrow={false}
          active
          fullWidth
        />
        <Button
          text="Сбросить настройки"
          showArrow={false}
          fullWidth
          variant="templateCard"
        />
      </div>

      {/* Модальное окно добавления канала */}
      {showCreateChannel && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateChannel(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CreateChannel
              onSubmit={handleAddChannel}
              onCancel={() => setShowCreateChannel(false)}
              loading={syncing}
            />
          </div>
        </div>
      )}
    </>
  );
}
