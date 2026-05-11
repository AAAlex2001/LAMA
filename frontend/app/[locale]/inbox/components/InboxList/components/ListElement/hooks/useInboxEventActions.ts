import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useSpecificInboxActionMutation,
  type InboxEventResponse,
  type InboxActionType,
  type SpecificActionResponse,
} from '@/store/inbox';

export interface BlockStatus {
  status: string;
  bot_id: number | null;
  tg_user_id: number | null;
  chat_id: number | null;
  message_id: number | null;
  affected_channels: number[] | null;
}

type BlockDispatcher = React.Dispatch<{
  type: 'open';
  eventId: number;
  username?: string;
  payload?: Record<string, unknown>;
}>;

interface Params {
  item: InboxEventResponse;
  blockDispatch?: BlockDispatcher;
}

interface Result {
  blockStatus: BlockStatus | null;
  loadingAction: InboxActionType | null;
  handleAction: (actionType: InboxActionType, payload?: Record<string, unknown>) => Promise<void>;
  saveActionResult: (response: SpecificActionResponse) => void;
}

export function useInboxEventActions({ item, blockDispatch }: Params): Result {
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<InboxActionType | null>(null);
  const router = useRouter();
  const { locale } = useParams();
  const { showError } = useNotifications();
  const mutation = useSpecificInboxActionMutation();

  const saveActionResult = useCallback((response: SpecificActionResponse) => {
    setBlockStatus({
      status: response.status || 'resolved',
      bot_id: response.bot_id ?? null,
      tg_user_id: response.tg_user_id ?? null,
      chat_id: response.chat_id ?? null,
      message_id: response.message_id ?? null,
      affected_channels: response.affected_channels ?? null,
    });
  }, []);

  const handleAction = useCallback(
    async (actionType: InboxActionType, payload?: Record<string, unknown>) => {
      if (actionType === 'block') {
        blockDispatch?.({
          type: 'open',
          eventId: item.id,
          username: item.tg_username || undefined,
          payload,
        });
        return;
      }

      setLoadingAction(actionType);
      try {
        const response = await mutation.mutateAsync({
          eventId: item.id,
          action_type: actionType,
          payload,
        });
        saveActionResult(response);

        if (actionType === 'reply') {
          const chatId = response.chat_id;
          const botId = response.bot_id;
          const messageId = item.event_type === 'system_trigger' ? undefined : item.payload?.message_id;
          const url = messageId
            ? `/${locale}/inbox/chat?chat_id=${chatId}&message_id=${messageId}&bot_id=${botId}`
            : `/${locale}/inbox/chat?chat_id=${chatId}&bot_id=${botId}`;
          setTimeout(() => router.push(url), 500);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Не удалось выполнить действие');
      } finally {
        setLoadingAction(null);
      }
    },
    [mutation, item, locale, router, showError, blockDispatch, saveActionResult],
  );

  return { blockStatus, loadingAction, handleAction, saveActionResult };
}
