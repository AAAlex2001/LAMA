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
}

export default function PostSettings({ className }: PostSettingsProps) {
  const [channels, setChannels] = useState<Channel[]>([
    { id: '1', name: 'LamaPlanner', selected: true },
    { id: '2', name: 'LamaPlanner 2', selected: true },
    { id: '3', name: 'LamaPlanner 3', selected: false },
    { id: '4', name: 'LamaPlanner 4', selected: false },
    { id: '5', name: 'LamaPlanner 5', selected: false },
  ]);

  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [pinPost, setPinPost] = useState(false);

  const handleChannelChange = (id: string, checked: boolean) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, selected: checked } : ch))
    );
  };

  const selectedChannelsCount = channels.filter((ch) => ch.selected).length;

  return (
    <div className={`${styles.postSettings} ${className || ''}`}>
      <div className={styles.settingsContent}>
        <div className={styles.title}>Настройки публикации</div>

        <div className={styles.settingsList}>
          {/* Каналы и чаты для постинга */}
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
          />

          {/* Тег поста */}
          <Dropdown label="Тег поста" />

          {/* Автоудаление поста */}
          <Dropdown label="Автоудаление поста" />

          {/* Повтор */}
          <Dropdown label="Повтор" />

          {/* Уведомлять подписчиков */}
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
            <Toggle checked={notifySubscribers} onChange={setNotifySubscribers} />
          </div>

          {/* Закрепить пост после публикации */}
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
            <Toggle checked={pinPost} onChange={setPinPost} />
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
