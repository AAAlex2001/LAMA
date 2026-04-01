'use client';

import { FC, useState, useEffect } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import DeleteConfirmationModal from '@/components/modal/modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchBotThunk,
  toggleBotOnChannelThunk,
  removeBotFromChannelThunk,
  selectCurrentBot,
  selectBotsToggling,
} from '@/store/bots';
import type { BotCardChannel } from '@/components/bot-card';
import BotCard from '@/components/bot-card';
import type { Channel } from '@/types/channel';
import JoinSettingsSection from './JoinSettingsSection';
import InviteLinksSection from './InviteLinksSection';
import styles from './BotsSection.module.scss';

interface BotsSectionProps {
  channel: Channel;
  botChannels: Channel[];
}

const BotsSection: FC<BotsSectionProps> = ({ channel, botChannels }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const bot = useAppSelector(selectCurrentBot);
  const toggling = useAppSelector(selectBotsToggling);

  const [botsOpen, setBotsOpen] = useState(false);
  const [removeBotOpen, setRemoveBotOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(min-width: 1440px)').matches) {
      setBotsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (channel.bot_id) {
      dispatch(fetchBotThunk(channel.bot_id));
    }
  }, [channel.bot_id, dispatch]);

  const handleToggle = async () => {
    try {
      const newActive = await dispatch(toggleBotOnChannelThunk(channel)).unwrap();
      showSuccess(newActive ? 'Бот активирован' : 'Бот деактивирован');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка переключения бота');
    }
  };

  const handleRemove = async () => {
    try {
      await dispatch(removeBotFromChannelThunk(channel)).unwrap();
      showSuccess('Бот удалён с канала');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка удаления бота');
    } finally {
      setRemoveBotOpen(false);
    }
  };

  const cardChannels: BotCardChannel[] = botChannels.map((ch) => ({
    id: ch.id,
    title: ch.title || 'Без названия',
    membersCount: ch.members_count ?? 0,
  }));

  return (
    <div className={styles.sections}>
      <InviteLinksSection channel={channel} />

      <JoinSettingsSection channel={channel} />

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
            channels={cardChannels}
            hideStats
            onToggleActive={handleToggle}
            onDelete={() => setRemoveBotOpen(true)}
            toggling={toggling}
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
