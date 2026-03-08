import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../index';
import {
  selectDirectChats,
  selectDirectChatsLoading,
  selectDirectChatsError,
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatIdFromUrlRef = useRef<number | null>(null);
  const messageIdFromUrlRef = useRef<number | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);

  const chats = useAppSelector(selectDirectChats);
  const chatsLoading = useAppSelector(selectDirectChatsLoading);
  const chatsError = useAppSelector(selectDirectChatsError);
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
    const chatIdParam = searchParams?.get('chat_id');
    if (chatIdParam) {
      const chatId = parseInt(chatIdParam, 10);
      if (!isNaN(chatId) && chatId > 0) {
        chatIdFromUrlRef.current = chatId;
        const messageIdParam = searchParams?.get('message_id');
        if (messageIdParam) {
          const msgId = parseInt(messageIdParam, 10);
          if (!isNaN(msgId) && msgId > 0) {
            messageIdFromUrlRef.current = msgId;
          }
        }
        if (chats.length === 0 && !chatsLoading) {
          dispatch(fetchDirectChatsThunk({}));
        }
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('chat_id');
          url.searchParams.delete('message_id');
          router.replace(url.pathname + url.search, { scroll: false });
        }
      }
    }
  }, [searchParams, router, chats.length, chatsLoading, dispatch]);

  useEffect(() => {
    if (chatIdFromUrlRef.current && chats.length > 0 && !chatsLoading) {
      const chatId = chatIdFromUrlRef.current;
      const chat = chats.find((c) => c.tg_chat_id === chatId);
      if (chat && activeChatId !== chat.id) {
        dispatch(setActiveChatId(chat.id));
      }
      if (messageIdFromUrlRef.current) {
        setReplyToMessageId(messageIdFromUrlRef.current);
        messageIdFromUrlRef.current = null;
      }
      chatIdFromUrlRef.current = null;
    }
  }, [chats, chatsLoading, activeChatId, dispatch]);

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
    activeChatId,
    activeChat,
    pinnedChats,
    unpinnedChats,
    sendingMessage,
    replyToMessageId,

    setActiveChat,
    fetchChats,
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
