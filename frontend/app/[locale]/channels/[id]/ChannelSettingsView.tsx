'use client';

import { FC, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Loader from '@/components/loader/loader';
import DeleteConfirmationModal from '@/components/modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../store';
import { deleteChannelThunk } from '@/app/[locale]/create-post/store/thunks/channels';
import type { Channel } from '@/types/channel';
import ConnectChannelModal from '../components/ConnectChannelModal';
import SettingsHeader from './components/SettingsHeader';
import ChannelInfoCard from './components/ChannelInfoCard';
import DescriptionEditor from './components/DescriptionEditor';
import EditChannelModal from './components/EditChannelModal';
import BotsSection from './components/BotsSection';
import DeleteButton from './components/DeleteButton';
import styles from './styles.module.scss';

interface ChannelSettingsViewProps {
  channelId: number;
}

const ChannelSettingsView: FC<ChannelSettingsViewProps> = ({ channelId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const { showSuccess, showError } = useNotifications();

  const channels = useAppSelector((s) => s.channels.channels) as Channel[];
  const total = useAppSelector((s) => s.channels.total);
  const channel = channels.find((ch) => ch.id === channelId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const botChannels = channels.filter((ch) => ch.bot_id === channel?.bot_id && channel?.bot_id);

  const handleDelete = async () => {
    if (!channel) return;
    try {
      await dispatch(deleteChannelThunk(channel.id)).unwrap();
      showSuccess('Канал удалён');
      router.push(`/${locale}/channels`);
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка удаления канала');
    } finally {
      setDeleteOpen(false);
    }
  };

  if (!channel) {
    return (
      <div className={styles.loader}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SettingsHeader
        connectedCount={channels.length}
        total={total}
        onConnect={() => setConnectOpen(true)}
      />

      <div className={styles.card}>
        <ChannelInfoCard channel={channel} onEdit={() => setEditOpen(true)} />
        <DescriptionEditor channel={channel} />
        <BotsSection channel={channel} botChannels={botChannels} />
        <DeleteButton onClick={() => setDeleteOpen(true)} />
      </div>

      <EditChannelModal
        channel={channel}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Удалить канал «${channel.title}»?`}
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

export default ChannelSettingsView;
