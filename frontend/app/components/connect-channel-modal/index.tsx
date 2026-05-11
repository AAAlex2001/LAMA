'use client';

import { FC, useState, useEffect } from 'react';
import CreateChannel from '@/components/create-channel/create-channel';
import type { BotOption } from '@/components/create-channel/create-channel';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { apiRequest } from '@/store/api';
import type { SyncChannelRequest, SyncChannelResponse } from '@/types/channel';
import styles from './styles.module.scss';

interface BotResponse {
  id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  token: string;
  status: string;
}

interface BotListResponse {
  items: BotResponse[];
  total: number;
}

const MASTER_BOT_USERNAME = 'LamaPlanner_bot';

function parseChannelInput(input: string): Omit<SyncChannelRequest, 'token' | 'bot_id'> {
  const trimmed = input.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return { telegram_id: parseInt(trimmed, 10) };
  }
  if (trimmed.includes('t.me/')) {
    return { invite_link: trimmed };
  }
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { username };
}

export interface ConnectChannelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ConnectChannelModal: FC<ConnectChannelModalProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [bots, setBots] = useState<BotOption[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBotsLoading(true);
    apiRequest<BotListResponse>('/bots?page=1&page_size=50', { method: 'GET' })
      .then((res) => {
        const botOptions: BotOption[] = (res.items || []).map((b) => ({
          id: b.id,
          username: b.username,
          firstName: b.first_name,
          isMaster: b.username === MASTER_BOT_USERNAME,
          token: b.token,
        }));
        botOptions.sort((a, b) => (a.isMaster ? -1 : 0) - (b.isMaster ? -1 : 0));
        setBots(botOptions);
      })
      .catch(() => setBots([]))
      .finally(() => setBotsLoading(false));
  }, [isOpen]);

  const handleSubmit = async (channelLink: string, bot: BotOption) => {
    setLoading(true);
    try {
      const channelData = parseChannelInput(channelLink);
      const syncData: SyncChannelRequest = {
        ...channelData,
        bot_id: bot.id,
      };
      const response = await apiRequest<SyncChannelResponse>('/channels/sync', {
        method: 'POST',
        body: JSON.stringify(syncData),
      });
      if (!response.success) {
        showError(response.message || 'Не удалось подключить канал');
        return;
      }
      showSuccess('Канал успешно подключён');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка подключения канала';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <CreateChannel
          onSubmit={handleSubmit}
          onCancel={handleClose}
          loading={loading}
          bots={bots}
          botsLoading={botsLoading}
        />
      </div>
    </div>
  );
};

export default ConnectChannelModal;
