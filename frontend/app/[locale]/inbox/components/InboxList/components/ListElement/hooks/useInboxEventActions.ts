import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { useAppDispatch, specificInboxActionThunk } from "../../../../../store";
import type {
  InboxEventResponse,
  InboxActionType,
  SpecificActionResponse,
} from "../../../../../store/thunks/inboxEvents";

export interface BlockStatus {
  status: string;
  bot_id: number | null;
  tg_user_id: number | null;
  chat_id: number | null;
  message_id: number | null;
  affected_channels: number[] | null;
}

type BlockDispatcher = React.Dispatch<{
  type: "open";
  eventId: number;
  username?: string;
  payload?: Record<string, unknown>;
}>;

interface UseInboxEventActionsParams {
  item: InboxEventResponse;
  blockDispatch?: BlockDispatcher;
}

interface UseInboxEventActionsReturn {
  blockStatus: BlockStatus | null;
  loadingAction: InboxActionType | null;
  handleAction: (
    actionType: InboxActionType,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  saveActionResult: (response: SpecificActionResponse) => void;
}

export function useInboxEventActions({
  item,
  blockDispatch,
}: UseInboxEventActionsParams): UseInboxEventActionsReturn {
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<InboxActionType | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useParams();
  const { showError } = useNotifications();

  const saveActionResult = useCallback((response: SpecificActionResponse) => {
    setBlockStatus({
      status: response.status || "resolved",
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
          type: "open",
          eventId: item.id,
          username: item.tg_username || undefined,
          payload,
        });
        return;
      }

      setLoadingAction(actionType);
      try {
        const result = await dispatch(
          specificInboxActionThunk({ eventId: item.id, action_type: actionType, payload }),
        );

        if (specificInboxActionThunk.rejected.match(result)) {
          showError((result.payload as string) || 'Не удалось выполнить действие');
          return;
        }

        const response = (result as { payload?: { response?: SpecificActionResponse } })
          ?.payload?.response;
        if (!response) return;

        saveActionResult(response);

        if (actionType === 'reply') {
          const chatId = response.chat_id;
          const botId = response.bot_id;
          const messageId =
            item.event_type === 'system_trigger' ? undefined : item.payload?.message_id;
          const url = messageId
            ? `/${locale}/inbox/chat?chat_id=${chatId}&message_id=${messageId}&bot_id=${botId}`
            : `/${locale}/inbox/chat?chat_id=${chatId}&bot_id=${botId}`;
          setTimeout(() => router.push(url), 500);
        }
      } catch {
        showError('Не удалось выполнить действие');
      } finally {
        setLoadingAction(null);
      }
    },
    [dispatch, item, locale, router, showError, blockDispatch, saveActionResult],
  );

  return {
    blockStatus,
    loadingAction,
    handleAction,
    saveActionResult,
  };
}
