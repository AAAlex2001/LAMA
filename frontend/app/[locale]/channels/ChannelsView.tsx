'use client';

import { FC, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import FilterTabs from '@/components/filter-tabs/filter-tabs';
import { Button } from '@/components/new-button';
import Loader from '@/components/loader/loader';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useChannelsQuery,
  useDeleteChannelMutation,
  useRefreshChannelsMutation,
} from '@/store/channels';
import type { Channel } from '@/types/channel';
import { CalendarRepeatIcon } from '@/components/icons';
import ChannelCard from './components/ChannelCard';
import DeleteConfirmationModal from '@/components/modal';
import EmptyState from './components/EmptyState';
import ConnectChannelModal from './components/ConnectChannelModal';
import Tooltip from '@/components/tooltip/tooltip';
import styles from './styles.module.scss';

type TabFilter = 'all' | 'channels' | 'groups';

const TAB_OPTIONS = [
  { id: 'all', label: 'Все' },
  { id: 'channels', label: 'Каналы' },
  { id: 'groups', label: 'Группы' },
];

const ChannelsView: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const { showSuccess, showError } = useNotifications();

  const channelsQuery = useChannelsQuery();
  const deleteMutation = useDeleteChannelMutation();
  const refreshMutation = useRefreshChannelsMutation();

  const channels = (channelsQuery.data?.items ?? []) as Channel[];
  const total = channelsQuery.data?.total ?? 0;
  const loading = channelsQuery.isLoading;
  const syncing = refreshMutation.isPending;

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [refreshHover, setRefreshHover] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return channels;
    if (activeTab === 'channels') return channels.filter((ch) => ch.channel_type === 'CHANNEL');
    return channels.filter((ch) => ch.channel_type === 'GROUP' || ch.channel_type === 'SUPERGROUP');
  }, [channels, activeTab]);

  const connectedCount = channels.length;

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      showSuccess('Каналы обновлены');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showSuccess('Канал удалён');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления канала');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSettings = (channel: Channel) => {
    router.push(`/${locale}/channels/${channel.id}`);
  };

  if (loading && channels.length === 0) {
    return (
      <div className={styles.loaderContainer}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (!loading && channels.length === 0) {
    return (
      <>
        <EmptyState onConnect={() => setConnectOpen(true)} />
        <ConnectChannelModal isOpen={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <FilterTabs
          options={TAB_OPTIONS}
          selectedFilter={activeTab}
          onFilterChange={(id) => setActiveTab(id as TabFilter)}
          stretch
          className={styles.tabs}
        />

        <div className={styles.connectBlock}>
          <div className={styles.connectRow}>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              className={styles.connectBtn}
              onClick={() => setConnectOpen(true)}
            >
              Подключить канал или группу
            </Button>
            <div
              className={styles.refreshWrapper}
              onMouseEnter={() => setRefreshHover(true)}
              onMouseLeave={() => setRefreshHover(false)}
            >
              <button
                className={`${styles.refreshBtn} ${syncing ? styles.refreshSpin : ''}`}
                onClick={handleRefresh}
                disabled={syncing}
              >
                <CalendarRepeatIcon width={26} height={26} color="#000000" />
              </button>
              <Tooltip text="Обновить информацию о каналах" visible={refreshHover} />
            </div>
          </div>
          <span className={styles.connectedInfo}>
            Подключено каналов и групп: {connectedCount}/{total}
          </span>
        </div>
      </div>

      <div className={styles.list}>
        {filtered.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onSettings={handleSettings}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Удалить канал «${deleteTarget?.title || ''}»?`}
        description="Все связанные с ним источники, публикации и настройки будут потеряны"
        confirmText="Удалить"
        cancelText="Назад"
        confirmVariant="outlined-red"
        confirmFirst
      />

      <ConnectChannelModal isOpen={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
};

export default ChannelsView;
