'use client';

import { useState } from 'react';
import styles from './create-channel.module.scss';
import classNames from 'classnames';
import Button from '@/components/button/button';
import Input from '@/components/input';

interface CreateChannelProps {
  className?: string;
  onSubmit?: (channelLink: string) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const INSTRUCTIONS = [
  'Добавьте бота @LamaPlanner_bot в администраторы канала',
  'Предоставьте боту права: публикация, редактирование и удаление постов',
  'Введите ID, username или ссылку на канал ниже',
];

export default function CreateChannel({
  className,
  onSubmit,
  onCancel,
  loading = false,
}: CreateChannelProps) {
  const [channelLink, setChannelLink] = useState('');

  const handleSubmit = () => {
    if (channelLink.trim()) {
      onSubmit?.(channelLink.trim());
    }
  };

  return (
    <div className={classNames(styles.createChannel, className)}>
      <div className={styles.header}>
        <h3 className={styles.title}>Подключите канал для публикации</h3>
      </div>

      <div className={styles.content}>
        <div className={styles.instructionsList}>
          {INSTRUCTIONS.map((instruction, index) => (
            <div key={index} className={styles.instructionItem}>
              <div className={styles.bulletWrapper}>
                <span className={styles.bullet} />
              </div>
              <span className={styles.instructionText}>{instruction}</span>
            </div>
          ))}
        </div>

        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Ссылка на канал</label>
          <input
            type="text"
            placeholder="Введите ID или Username"
            value={channelLink}
            onChange={(e) => setChannelLink(e.target.value)}
            className={styles.input}
          />
          <span className={styles.inputHint}>
            Например: @channelname, https://t.me/channelname или -1213456781012
          </span>
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          text="Подключить"
          showArrow={false}
          active
          fullWidth
          onClick={handleSubmit}
          loading={loading}
          disabled={!channelLink.trim()}
        />
      </div>
    </div>
  );
}
