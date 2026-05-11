import { useEffect } from 'react';
import { useChannelsQuery } from '@/store/channels';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export function usePostEditorChannelEffects() {
  const { error } = useChannelsQuery();
  const { showError } = useNotifications();

  useEffect(() => {
    if (error) showError(error instanceof Error ? error.message : 'Ошибка загрузки каналов');
  }, [error, showError]);
}
