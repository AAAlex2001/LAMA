'use client';

import { FC, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Loader from '@/components/loader/loader';
import DeleteConfirmationModal from '@/components/modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { ChannelBasic } from '@/types/channel';
import {
  useBotQuery,
  useBotsQuery,
  useDeleteBotMutation,
  useActivateBotMutation,
  useDeactivateBotMutation,
  useCreateBotMutation,
} from '@/store/bots';
import { useChannelsQuery } from '@/store/channels';
import ConnectBotModal from '../components/ConnectBotModal';
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
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const { showSuccess, showError } = useNotifications();

  const botQuery = useBotQuery(botId);
  const botsQuery = useBotsQuery();
  const channelsQuery = useChannelsQuery();
  const deleteBot = useDeleteBotMutation();
  const activateBot = useActivateBotMutation();
  const deactivateBot = useDeactivateBotMutation();
  const createBot = useCreateBotMutation();

  const bot = botQuery.data;
  const bots = botsQuery.data?.items ?? [];
  const channels = (channelsQuery.data?.items ?? []) as ChannelBasic[];

  const [activeTab, setActiveTab] = useState('settings');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const botChannels = channels.filter((ch) => ch.bot_id === botId);

  const handleDelete = async () => {
    if (!bot) return;
    try {
      await deleteBot.mutateAsync(bot.id);
      showSuccess('Бот удалён');
      router.push(`/${locale}/bots`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления бота');
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleToggleActive = async () => {
    if (!bot) return;
    try {
      if (bot.status === 'ACTIVE') {
        await deactivateBot.mutateAsync(bot.id);
        showSuccess('Бот остановлен');
      } else {
        await activateBot.mutateAsync(bot.id);
        showSuccess('Бот запущен');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось изменить статус');
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
          <BotGeneralSection bot={bot} channels={botChannels} allChannels={channels} />
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
          await createBot.mutateAsync({ token });
          showSuccess('Бот подключён');
        }}
      />
    </div>
  );
};

export default BotSettingsView;
