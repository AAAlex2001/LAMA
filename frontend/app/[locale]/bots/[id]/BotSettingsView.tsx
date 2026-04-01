'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Loader from '@/components/loader/loader';
import DeleteConfirmationModal from '@/components/modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { ChannelBasic } from '@/types/channel';
import {
  type Bot,
  selectCurrentBot,
  fetchBotThunk,
  deleteBotThunk,
  deactivateBotThunk,
  activateBotThunk,
  createBotThunk,
  fetchBotsThunk,
  selectBots,
} from '@/store/bots';
import ConnectBotModal from '../components/ConnectBotModal';
import { useAppDispatch, useAppSelector } from '../store';
import BotSettingsHeader from './components/BotSettingsHeader';
import BotInfoCard from './components/BotInfoCard';
import BotGeneralSection from './components/BotGeneralSection';
import BotMessagesSection from './components/BotMessagesSection';
import EditBotModal from './components/EditBotModal';
import styles from './styles.module.scss';

interface BotSettingsViewProps {
  botId: number;
}

const BotSettingsView: FC<BotSettingsViewProps> = ({ botId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const { showSuccess, showError } = useNotifications();

  const bot = useAppSelector(selectCurrentBot);
  const bots = useAppSelector(selectBots);
  const channels = useAppSelector((s) => s.channels.channels) as ChannelBasic[];

  const [activeTab, setActiveTab] = useState('settings');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchBotThunk(botId));
  }, [dispatch, botId]);

  const botChannels = channels.filter((ch) => ch.bot_id === botId);

  const handleDelete = async () => {
    if (!bot) return;
    try {
      await dispatch(deleteBotThunk(bot.id)).unwrap();
      showSuccess('Бот удалён');
      router.push(`/${locale}/bots`);
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка удаления бота');
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleToggleActive = async () => {
    if (!bot) return;
    try {
      if (bot.status === 'ACTIVE') {
        await dispatch(deactivateBotThunk(bot.id)).unwrap();
        showSuccess('Бот остановлен');
      } else {
        await dispatch(activateBotThunk(bot.id)).unwrap();
        showSuccess('Бот запущен');
      }
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Не удалось изменить статус');
    }
  };

  if (!bot) {
    return (
      <div className={styles.loader}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <BotSettingsHeader
        connectedCount={bots.length}
        total={5}
        onConnect={() => setConnectOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className={styles.card}>
        <div className={styles.infoRow}>
          <BotInfoCard
            bot={bot}
            onEdit={() => setEditOpen(true)}
            onToggleActive={handleToggleActive}
          />
        </div>

        {activeTab === 'settings' && (
          <BotGeneralSection bot={bot} channels={botChannels} />
        )}

        {activeTab === 'messages' && (
          <BotMessagesSection />
        )}
      </div>

      <EditBotModal
        bot={bot}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Удалить бота «${bot.first_name || bot.username}»?`}
        description="Бот будет отключён от сервиса. Каналы придётся привязать заново."
        confirmText="Удалить"
        cancelText="Назад"
        confirmVariant="outlined-red"
        confirmFirst
      />

      <ConnectBotModal
        isOpen={connectOpen}
        onOpenChange={setConnectOpen}
        onSubmit={async (token) => {
          await dispatch(createBotThunk({ token })).unwrap();
          showSuccess('Бот подключён');
          dispatch(fetchBotsThunk({}));
        }}
      />
    </div>
  );
};

export default BotSettingsView;
