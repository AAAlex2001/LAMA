import { useCallback, useEffect, useRef } from 'react';
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
  selectDirectMessagesDetached,
  selectSendingMessage,
  selectChatSort,
  selectChatUnreadFilter,
  selectReplyToMessageId,
  selectBotAutomatizationModalOpen,
  selectTriggerModalOpen,
  selectGlobalMessageModalOpen,
  selectSelectedBotIds,
} from '../selectors';
import {
  setActiveChatId,
  wsMessageReceived,
  setWsConnected,
  setSendingMessage,
  setReplyToMessageId,
  resetToLatest,
  setBotAutomatizationModalOpen,
  setTriggerModalOpen,
  setGlobalMessageModalOpen,
  setSelectedBotIds,
  toggleBotSelection,
  selectAllBots,
  makeChatKey,
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

  const chats = useAppSelector(selectDirectChats);
  const chatsLoading = useAppSelector(selectDirectChatsLoading);
  const chatsError = useAppSelector(selectDirectChatsError);
  const chatsHasMore = useAppSelector(selectDirectChatsHasMore);
  const activeChatId = useAppSelector(selectActiveChatId);
  const activeChat = useAppSelector(selectActiveChat);
  const pinnedChats = useAppSelector(selectPinnedChats);
  const unpinnedChats = useAppSelector(selectUnpinnedChats);
  const sendingMessage = useAppSelector(selectSendingMessage);
  const chatSort = useAppSelector(selectChatSort);
  const chatUnreadFilter = useAppSelector(selectChatUnreadFilter);
  const replyToMessageId = useAppSelector(selectReplyToMessageId);
  const isBotAutomatizationModalOpen = useAppSelector(selectBotAutomatizationModalOpen);
  const isTriggerModalOpen = useAppSelector(selectTriggerModalOpen);
  const isGlobalMessageModalOpen = useAppSelector(selectGlobalMessageModalOpen);
  const selectedBotIds = useAppSelector(selectSelectedBotIds);

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
    (chatId: string | null) => {
      dispatch(setActiveChatId(chatId));
    },
    [dispatch]
  );

  const fetchChats = useCallback(
    (params: FetchDirectChatsParams = {}) => {
      return dispatch(fetchDirectChatsThunk({
        sort: chatSort,
        unread: chatUnreadFilter,
        ...params,
      }));
    },
    [dispatch, chatSort, chatUnreadFilter]
  );

  const fetchMoreChats = useCallback(() => {
    if (chatsLoading || !chatsHasMore) return;
    return dispatch(fetchDirectChatsThunk({
      skip: chats.length,
      limit: 50,
      sort: chatSort,
      unread: chatUnreadFilter,
    }));
  }, [dispatch, chats.length, chatsLoading, chatsHasMore, chatSort, chatUnreadFilter]);

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
      inline_keyboard?: SendDirectMessageParams['inline_keyboard'];
      buttons?: SendDirectMessageParams['buttons'];
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
          const chatKey = makeChatKey(activeChat.bot_id, activeChat.tg_chat_id);
          for (const message of result.payload.items) {
            dispatch(wsMessageReceived({
              chatKey,
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

  const setReplyToMessageIdAction = useCallback(
    (messageId: number | null) => {
      dispatch(setReplyToMessageId(messageId));
    },
    [dispatch]
  );

  const setBotAutomatizationModalOpenAction = useCallback(
    (isOpen: boolean) => {
      dispatch(setBotAutomatizationModalOpen(isOpen));
    },
    [dispatch]
  );

  const setTriggerModalOpenAction = useCallback(
    (isOpen: boolean) => {
      dispatch(setTriggerModalOpen(isOpen));
    },
    [dispatch]
  );

  const setGlobalMessageModalOpenAction = useCallback(
    (isOpen: boolean) => {
      dispatch(setGlobalMessageModalOpen(isOpen));
    },
    [dispatch]
  );

  const toggleBotSelectionAction = useCallback(
    (botId: number) => {
      dispatch(toggleBotSelection(botId));
    },
    [dispatch]
  );

  const selectAllBotsAction = useCallback(
    (botIds: number[]) => {
      dispatch(selectAllBots(botIds));
    },
    [dispatch]
  );

  const setSelectedBotIdsAction = useCallback(
    (botIds: number[]) => {
      dispatch(setSelectedBotIds(botIds));
    },
    [dispatch]
  );

  const jumpToLatestMessages = useCallback(() => {
    if (!activeChat) return;
    dispatch(resetToLatest(makeChatKey(activeChat.bot_id, activeChat.tg_chat_id)));
    return dispatch(fetchDirectMessagesThunk({
      botId: activeChat.bot_id,
      tgChatId: activeChat.tg_chat_id,
      skip: 0,
      limit: 50,
    }));
  }, [dispatch, activeChat]);

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
    isBotAutomatizationModalOpen,
    isTriggerModalOpen,
    isGlobalMessageModalOpen,
    selectedBotIds,

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
    jumpToLatest: jumpToLatestMessages,
    setReplyToMessageId: setReplyToMessageIdAction,
    setBotAutomatizationModalOpen: setBotAutomatizationModalOpenAction,
    setTriggerModalOpen: setTriggerModalOpenAction,
    setGlobalMessageModalOpen: setGlobalMessageModalOpenAction,
    toggleBotSelection: toggleBotSelectionAction,
    selectAllBots: selectAllBotsAction,
    setSelectedBotIds: setSelectedBotIdsAction,
  };
}

export function useDirectMessages(chatKey: string) {
  const messages = useAppSelector(selectDirectMessages(chatKey));
  const loading = useAppSelector(selectDirectMessagesLoading(chatKey));
  const hasMore = useAppSelector(selectDirectMessagesHasMore(chatKey));
  const isDetached = useAppSelector(selectDirectMessagesDetached(chatKey));

  return { messages, loading, hasMore, isDetached };
}
