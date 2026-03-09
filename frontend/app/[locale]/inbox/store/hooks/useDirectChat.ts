import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import {
  selectDirectChats,
  selectDirectChatsLoading,
  selectDirectChatsError,
  selectDirectChatsHasMore,
  selectActiveChatId,
  selectActiveChat,
  selectPinnedChats,
  selectUnpinnedChats,
  selectDirectMessages,
  selectDirectMessagesLoading,
  selectDirectMessagesHasMore,
  selectSendingMessage,
} from '../selectors';
import {
  setActiveChatId,
  wsMessageReceived,
  setWsConnected,
  setSendingMessage,
} from '../slices/directChat';
import {
  fetchDirectChatsThunk,
  fetchDirectMessagesThunk,
  sendDirectMessageThunk,
  updateDirectChatThunk,
  editDirectMessageThunk,
  deleteDirectMessageThunk,
} from '../thunks/directChat';
import type {
  FetchDirectChatsParams,
  FetchDirectMessagesParams,
  SendDirectMessageParams,
  EditDirectMessageParams,
  DeleteDirectMessageParams,
  UpdateDirectChatParams,
  MessageType,
} from '../thunks/directChat';
import { directChatWs, type WsEvent } from '../services/directChatWs';

export function useDirectChat() {
  const dispatch = useAppDispatch();
  const handlersSetRef = useRef(false);
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);

  const chats = useAppSelector(selectDirectChats);
  const chatsLoading = useAppSelector(selectDirectChatsLoading);
  const chatsError = useAppSelector(selectDirectChatsError);
  const chatsHasMore = useAppSelector(selectDirectChatsHasMore);
  const activeChatId = useAppSelector(selectActiveChatId);
  const activeChat = useAppSelector(selectActiveChat);
  const pinnedChats = useAppSelector(selectPinnedChats);
  const unpinnedChats = useAppSelector(selectUnpinnedChats);
  const sendingMessage = useAppSelector(selectSendingMessage);

  useEffect(() => {
    if (handlersSetRef.current) return;
    handlersSetRef.current = true;

    directChatWs.setHandlers(
      (event: WsEvent) => {
        if (event.type === 'message_new') {
          dispatch(fetchDirectMessagesThunk({
            botId: event.bot_id,
            tgChatId: event.chat_id,
            skip: 0,
            limit: 50,
          }));
        } else if (event.type === 'message_edited' || event.type === 'message_deleted') {
          dispatch(fetchDirectMessagesThunk({
            botId: event.bot_id,
            tgChatId: event.chat_id,
            skip: 0,
            limit: 50,
          }));
        } else if (event.type === 'chat_updated') {
          dispatch(fetchDirectChatsThunk({}));
        }
      },
      (connected) => {
        dispatch(setWsConnected(connected));
      }
    );

    return () => {
      directChatWs.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeChat) {
      directChatWs.connect(activeChat.bot_id, activeChat.tg_chat_id);
    } else {
      directChatWs.disconnect();
    }
  }, [activeChat?.bot_id, activeChat?.tg_chat_id]);

  const setActiveChat = useCallback(
    (chatId: number | null) => {
      dispatch(setActiveChatId(chatId));
    },
    [dispatch]
  );

  const fetchChats = useCallback(
    (params: FetchDirectChatsParams = {}) => {
      return dispatch(fetchDirectChatsThunk(params));
    },
    [dispatch]
  );

  const fetchMoreChats = useCallback(() => {
    if (chatsLoading || !chatsHasMore) return;
    return dispatch(fetchDirectChatsThunk({ skip: chats.length, limit: 50 }));
  }, [dispatch, chats.length, chatsLoading, chatsHasMore]);

  const fetchMessages = useCallback(
    (params: FetchDirectMessagesParams) => {
      return dispatch(fetchDirectMessagesThunk(params));
    },
    [dispatch]
  );

  const sendMessage = useCallback(
    async (params: {
      text_content?: string;
      media_url?: string;
      media_urls?: string[];
      media_type?: MessageType;
      buttons?: Record<string, unknown>;
      reply_to_message_id?: number;
    }) => {
      if (!activeChat) {
        console.warn('No active chat, cannot send message');
        return null;
      }

      dispatch(setSendingMessage(true));

      const sendParams: SendDirectMessageParams = {
        botId: activeChat.bot_id,
        tgChatId: activeChat.tg_chat_id,
        chat_id: activeChat.tg_chat_id,
        ...params,
      };

      try {
        const result = await dispatch(sendDirectMessageThunk(sendParams));
        if (sendDirectMessageThunk.fulfilled.match(result)) {
          for (const message of result.payload.items) {
            dispatch(wsMessageReceived({
              tgChatId: activeChat.tg_chat_id,
              message,
            }));
          }
          return result.payload.items;
        }
        return null;
      } finally {
        dispatch(setSendingMessage(false));
      }
    },
    [dispatch, activeChat]
  );

  const updateChat = useCallback(
    (params: UpdateDirectChatParams) => {
      return dispatch(updateDirectChatThunk(params));
    },
    [dispatch]
  );

  const pinChat = useCallback(
    (chatId: number) => {
      return dispatch(updateDirectChatThunk({ chatId, is_pinned: true }));
    },
    [dispatch]
  );

  const unpinChat = useCallback(
    (chatId: number) => {
      return dispatch(updateDirectChatThunk({ chatId, is_pinned: false }));
    },
    [dispatch]
  );

  const blockChat = useCallback(
    (chatId: number) => {
      return dispatch(updateDirectChatThunk({ chatId, is_blocked: true }));
    },
    [dispatch]
  );

  const unblockChat = useCallback(
    (chatId: number) => {
      return dispatch(updateDirectChatThunk({ chatId, is_blocked: false }));
    },
    [dispatch]
  );

  const editMessage = useCallback(
    (params: EditDirectMessageParams) => {
      return dispatch(editDirectMessageThunk(params));
    },
    [dispatch]
  );

  const deleteMessage = useCallback(
    (params: DeleteDirectMessageParams) => {
      return dispatch(deleteDirectMessageThunk(params));
    },
    [dispatch]
  );

  return {
    chats,
    chatsLoading,
    chatsError,
    chatsHasMore,
    activeChatId,
    activeChat,
    pinnedChats,
    unpinnedChats,
    sendingMessage,
    replyToMessageId,

    setActiveChat,
    fetchChats,
    fetchMoreChats,
    fetchMessages,
    sendMessage,
    updateChat,
    pinChat,
    unpinChat,
    blockChat,
    unblockChat,
    editMessage,
    deleteMessage,
    setReplyToMessageId,
  };
}

export function useDirectMessages(tgChatId: number) {
  const messages = useAppSelector(selectDirectMessages(tgChatId));
  const loading = useAppSelector(selectDirectMessagesLoading(tgChatId));
  const hasMore = useAppSelector(selectDirectMessagesHasMore(tgChatId));

  return { messages, loading, hasMore };
}
