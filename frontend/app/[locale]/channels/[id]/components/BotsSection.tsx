'use client';

import { FC, useState, useEffect } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import DeleteConfirmationModal from '@/components/modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchChannelBotThunk, toggleBotActiveThunk, removeBotThunk } from '../../store/thunks/bots';
import type { Channel } from '@/types/channel';
import BotCard from './BotCard';
import styles from './BotsSection.module.scss';

const INACTIVE_SECTIONS = [
  { id: 'invite-links', label: 'Ссылки-приглашения' },
  { id: 'join-settings', label: 'Настройки вступления' },
];

interface BotsSectionProps {
  channel: Channel;
  botChannels: Channel[];
}

const BotsSection: FC<BotsSectionProps> = ({ channel, botChannels }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const bot = useAppSelector((s) => s.bots.bot);
  const toggling = useAppSelector((s) => s.bots.toggling);

  const [botsOpen, setBotsOpen] = useState(false);
  const [removeBotOpen, setRemoveBotOpen] = useState(false);

  useEffect(() => {
    if (channel.bot_id) {
      dispatch(fetchChannelBotThunk(channel.bot_id))
        .unwrap()
        .catch((err) => showError(typeof err === 'string' ? err : 'Не удалось загрузить данные бота'));
    }
  }, [channel.bot_id, dispatch, showError]);

  const handleToggle = async () => {
    try {
      const newActive = await dispatch(toggleBotActiveThunk(channel)).unwrap();
      showSuccess(newActive ? 'Бот активирован' : 'Бот деактивирован');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка переключения бота');
    }
  };

  const handleRemove = async () => {
    try {
      await dispatch(removeBotThunk(channel)).unwrap();
      showSuccess('Бот удалён с канала');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка удаления бота');
    } finally {
      setRemoveBotOpen(false);
    }
  };

  const isBotActive = channel.is_bot_active !== false;

  return (
    <div className={styles.sections}>
      {INACTIVE_SECTIONS.map((section) => (
        <button key={section.id} className={styles.row} type="button" disabled>
          <span className={styles.label}>{section.label}</span>
          <ChevronDownIcon width={16} height={16} color="#383F45" className={styles.chevron} />
        </button>
      ))}

      <button
        className={`${styles.row} ${styles.rowActive}`}
        type="button"
        onClick={() => setBotsOpen(!botsOpen)}
      >
        <span className={styles.label}>Подключенные боты</span>
        <ChevronDownIcon
          width={16}
          height={16}
          color="#383F45"
          className={`${styles.chevron} ${botsOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {botsOpen && bot && (
        <div className={styles.list}>
          <BotCard
            bot={bot}
            isBotActive={isBotActive}
            toggling={toggling}
            botChannels={botChannels}
            onToggleActive={handleToggle}
            onRemove={() => setRemoveBotOpen(true)}
          />
        </div>
      )}

      {botsOpen && !bot && !channel.bot_id && (
        <div className={styles.list}>
          <span className={styles.emptyText}>Нет подключённых ботов</span>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={removeBotOpen}
        onClose={() => setRemoveBotOpen(false)}
        onConfirm={handleRemove}
        title={`Удалить бота «${bot?.first_name || ''}» с канала?`}
        description="Бот будет полностью отвязан от этого канала"
        confirmText="Удалить"
        cancelText="Назад"
        confirmVariant="outlined-red"
        confirmFirst
      />
    </div>
  );
};

export default BotsSection;
