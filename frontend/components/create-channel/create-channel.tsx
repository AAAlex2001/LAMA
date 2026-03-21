'use client';

import { useState } from 'react';
import styles from './create-channel.module.scss';
import classNames from 'classnames';
import Button from '@/components/button/button';

export interface BotOption {
  id: number;
  username: string;
  firstName: string;
  isMaster?: boolean;
  token?: string;
}

interface CreateChannelProps {
  className?: string;
  onSubmit?: (channelLink: string, bot: BotOption) => void;
  onCancel?: () => void;
  loading?: boolean;
  bots?: BotOption[];
  botsLoading?: boolean;
}

export default function CreateChannel({
  className,
  onSubmit,
  loading = false,
  bots = [],
  botsLoading = false,
}: CreateChannelProps) {
  const [channelLink, setChannelLink] = useState('');
  const [selectedBotId, setSelectedBotId] = useState<number | null>(
    bots.length > 0 ? bots[0].id : null
  );

  const selectedBot = bots.find((b) => b.id === selectedBotId) || bots[0] || null;
  const botUsername = selectedBot?.username ? `@${selectedBot.username}` : '@LamaPlanner_bot';

  const instructions = [
    `Добавьте бота ${botUsername} в администраторы канала`,
    'Предоставьте боту права: публикация, редактирование и удаление постов',
    'Введите ID, username или ссылку на канал ниже',
  ];

  const handleSubmit = () => {
    if (channelLink.trim() && selectedBot) {
      onSubmit?.(channelLink.trim(), selectedBot);
    }
  };

  return (
    <div className={classNames(styles.createChannel, className)}>
      <div className={styles.header}>
        <h3 className={styles.title}>Подключите канал для публикации</h3>
      </div>

      <div className={styles.content}>
        {/* Bot selector */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Бот для управления каналом</label>
          {botsLoading ? (
            <div className={styles.botListLoading}>Загрузка ботов...</div>
          ) : bots.length === 0 ? (
            <div className={styles.botListEmpty}>Нет доступных ботов</div>
          ) : (
            <div className={styles.botList}>
              {bots.map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  className={classNames(styles.botItem, {
                    [styles.botItemSelected]: selectedBotId === bot.id,
                  })}
                  onClick={() => setSelectedBotId(bot.id)}
                >
                  <span className={styles.botName}>
                    {bot.firstName || bot.username}
                    {bot.isMaster && <span className={styles.botBadge}>Мастер</span>}
                  </span>
                  <span className={styles.botUsername}>@{bot.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.instructionsList}>
          {instructions.map((instruction, index) => (
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
          disabled={!channelLink.trim() || !selectedBot}
        />
      </div>
    </div>
  );
}
