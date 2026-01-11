'use client';

import { useState } from 'react';
import styles from './post-settings.module.scss';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';

interface Channel {
  id: string;
  name: string;
  selected: boolean;
}

interface PostSettingsProps {
  className?: string;
  onSettingsChange?: (settings: {
    channels: Channel[];
    notifySubscribers: boolean;
    pinPost: boolean;
  }) => void;
}

export default function PostSettings({ className, onSettingsChange }: PostSettingsProps) {
  const [channels, setChannels] = useState<Channel[]>([
    { id: '1', name: 'Тест лама 1', selected: true },
  ]);

  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [pinPost, setPinPost] = useState(false);

  const handleChannelChange = (id: string, checked: boolean) => {
    setChannels((prev) => {
      const updated = prev.map((ch) => (ch.id === id ? { ...ch, selected: checked } : ch));
      
      // Уведомляем родителя об изменениях
      if (onSettingsChange) {
        onSettingsChange({
          channels: updated,
          notifySubscribers,
          pinPost,
        });
      }
      
      return updated;
    });
  };

  // Уведомляем об изменениях toggles
  const handleNotifyChange = (checked: boolean) => {
    setNotifySubscribers(checked);
    if (onSettingsChange) {
      onSettingsChange({ channels, notifySubscribers: checked, pinPost });
    }
  };

  const handlePinChange = (checked: boolean) => {
    setPinPost(checked);
    if (onSettingsChange) {
      onSettingsChange({ channels, notifySubscribers, pinPost: checked });
    }
  };

  const selectedChannelsCount = channels.filter((ch) => ch.selected).length;

  return (
    <div className={`${styles.postSettings} ${className || ''}`}>
      <div className={styles.settingsContent}>
        <div className={styles.title}>Настройки публикации</div>

        <div className={styles.settingsList}>
          <Dropdown
            label="Каналы и чаты для постинга"
            options={channels.map((ch) => ({
              id: ch.id,
              label: ch.name,
              checked: ch.selected,
            }))}
            showSearch
            showCheckboxes
            onOptionChange={handleChannelChange}
            onAddNew={() => console.log('Add new channel')}
            addNewLabel="Подключить новый"
            selectedCount={selectedChannelsCount}
            totalCount={channels.length}
            ChannelsAndChats="channels"
          />

          <Dropdown 
            label="Тег поста"
            Tags='tags'
            showSearch
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
  );
}
