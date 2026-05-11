'use client';

import { FC, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Loader from '@/components/loader/loader';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import DeleteConfirmationModal from '@/components/modal/modal';
import { apiRequest } from '@/store/api';
import type { ChannelBasic } from '@/types/channel';
import {
  type Bot,
  type BotStatsPayload,
  useBotsQuery,
  useCreateBotMutation,
  useDeleteBotMutation,
  useActivateBotMutation,
  useDeactivateBotMutation,
} from '@/store/bots';
import { useChannelsQuery } from '@/store/channels';
import BotCard, { type BotCardChannel } from '@/components/bot-card';
import ConnectBotModal from './components/ConnectBotModal';
import BotStatsModal from './components/BotStatsModal';
import s from './styles.module.scss';

const MAX_BOTS = 5;

function buildChannelMap(channels: ChannelBasic[]): Map<number, BotCardChannel[]> {
  const map = new Map<number, BotCardChannel[]>();
  for (const ch of channels) {
    if (!ch.bot_id) continue;
    const list = map.get(ch.bot_id) ?? [];
    list.push({ id: ch.id, title: ch.title || 'Без названия', membersCount: ch.members_count ?? 0 });
    map.set(ch.bot_id, list);
  }
  return map;
}

const BotsView: FC = () => {
  const router = useRouter();
  const locale = usePathname().split('/')[1] || 'ru';
  const { showSuccess, showError } = useNotifications();

  const botsQuery = useBotsQuery();
  const channelsQuery = useChannelsQuery();
  const createBot = useCreateBotMutation();
  const deleteBot = useDeleteBotMutation();
  const activateBot = useActivateBotMutation();
  const deactivateBot = useDeactivateBotMutation();

  const bots = botsQuery.data?.items ?? [];
  const loading = botsQuery.isLoading;
  const channels = (channelsQuery.data?.items ?? []) as ChannelBasic[];

  const [connectOpen, setConnectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const [statsBot, setStatsBot] = useState<Bot | null>(null);
  const [statsData, setStatsData] = useState<BotStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toggleId, setToggleId] = useState<number | null>(null);

  const channelMap = buildChannelMap(channels);

  const handleCreate = async (token: string) => {
    try {
      await createBot.mutateAsync({ token });
      showSuccess('Бот подключён');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось подключить бота');
      throw err;
    }
  };

  const handleSettings = (bot: Bot) => {
    router.push(`/${locale}/bots/${bot.id}`);
  };

  const handleStats = async (bot: Bot) => {
    setStatsBot(bot);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const data = await apiRequest<BotStatsPayload>(`/bots/${bot.id}/stats`, { method: 'GET' });
      setStatsData(data);
    } catch {
      showError('Не удалось загрузить статистику');
      setStatsBot(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggle = async (bot: Bot) => {
    setToggleId(bot.id);
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
    } finally {
      setToggleId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBot.mutateAsync(deleteTarget.id);
      showSuccess('Бот удалён');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Не удалось удалить бота');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading && bots.length === 0) {
    return (
      <div className={s.loaderContainer}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (!loading && bots.length === 0) {
    return (
      <>
        <div className={s.container}>
          <div className={s.empty}>
            <span className={s.emptyTitle}>Боты ещё не подключены</span>
            <span className={s.emptySubtitle}>
              Добавьте токен от @BotFather, чтобы управлять автоматизацией и привязкой к каналам
            </span>
            <Button variant="fill" intent="gradient" size="lg" className={s.connectBtn} onClick={() => setConnectOpen(true)}>
              Подключить бота
            </Button>
          </div>
        </div>
        <ConnectBotModal isOpen={connectOpen} onOpenChange={setConnectOpen} onSubmit={handleCreate} />
      </>
    );
  }

  return (
    <div className={s.container}>
      <div className={s.topBar}>
        <span className={s.connectedInfo}>Подключено ботов: {bots.length}/{MAX_BOTS}</span>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          className={s.connectBtn}
          onClick={() => setConnectOpen(true)}
          disabled={bots.length >= MAX_BOTS}
        >
          Подключить
        </Button>
      </div>

      <div className={s.list}>
        {bots.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            channels={channelMap.get(bot.id) ?? []}
            onSettings={handleSettings}
            onStats={handleStats}
            onToggleActive={handleToggle}
            onDelete={setDeleteTarget}
            toggling={toggleId === bot.id}
          />
        ))}
      </div>

      <ConnectBotModal isOpen={connectOpen} onOpenChange={setConnectOpen} onSubmit={handleCreate} />

      <BotStatsModal
        isOpen={!!statsBot}
        onClose={() => { setStatsBot(null); setStatsData(null); }}
        stats={statsData}
        loading={statsLoading}
        botTitle={statsBot?.first_name || statsBot?.title || statsBot?.username}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget ? `Удалить бота «${deleteTarget.first_name || deleteTarget.username}»?` : ''}
        description="Бот будет отключён от сервиса. Каналы придётся привязать заново."
        confirmText="Удалить"
        cancelText="Назад"
        confirmVariant="outlined-red"
        confirmFirst
      />
    </div>
  );
};

export default BotsView;
