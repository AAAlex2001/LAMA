import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import {
  selectChatsById,
  selectChatOrder,
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
  selectDirectMessagesHasNewer,
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
  makeChatKey,
} from '../slices/directChat';
import {
  fetchDirectChatsThunk,
  fetchMoreDirectChatsThunk,
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

  const chatsById = useAppSelector(selectChatsById);
  const chatOrder = useAppSelector(selectChatOrder);
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
        switch (event.type) {
          case 'message_new':
          case 'message_edited':
          case 'message_deleted':
            dispatch(fetchDirectMessagesThunk({
              botId: event.bot_id,
              tgChatId: event.chat_id,
              skip: 0,
              limit: 50,
            }));
          break;
          case 'chat_updated':
            dispatch(fetchDirectChatsThunk({}));
          break;
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

  const setActiveChat = (chatId: string | null) => {
    dispatch(setActiveChatId(chatId));
  };

  const fetchChats = (params: FetchDirectChatsParams = {}) => {
    return dispatch(fetchDirectChatsThunk({
      sort: chatSort,
      unread: chatUnreadFilter,
      ...params,
    }));
  };

  const fetchMoreChats = () => {
    return dispatch(fetchMoreDirectChatsThunk());
  };

  const fetchMessages = (params: FetchDirectMessagesParams) => {
    return dispatch(fetchDirectMessagesThunk(params));
  };

  const sendMessage = async (params: {
    text_content?: string;
    media_url?: string;
    media_urls?: string[];
    media_file_ids?: string[];
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
  };

  const updateChat = (params: UpdateDirectChatParams) => dispatch(updateDirectChatThunk(params));

  const pinChat = (chatId: number) => dispatch(updateDirectChatThunk({ chatId, is_pinned: true }));

  const unpinChat = (chatId: number) => dispatch(updateDirectChatThunk({ chatId, is_pinned: false }));

  const blockChat = (chatId: number) => dispatch(updateDirectChatThunk({ chatId, is_blocked: true }));

  const unblockChat = (chatId: number) => dispatch(updateDirectChatThunk({ chatId, is_blocked: false }));

  const editMessage = (params: EditDirectMessageParams) => dispatch(editDirectMessageThunk(params));

  const deleteMessage = (params: DeleteDirectMessageParams) => dispatch(deleteDirectMessageThunk(params));

  const setReplyToMessageIdAction = (messageId: number | null) => dispatch(setReplyToMessageId(messageId));

  const setBotAutomatizationModalOpenAction = (isOpen: boolean) => dispatch(setBotAutomatizationModalOpen(isOpen));

  const setTriggerModalOpenAction = (isOpen: boolean) => dispatch(setTriggerModalOpen(isOpen));

  const setGlobalMessageModalOpenAction = (isOpen: boolean) => dispatch(setGlobalMessageModalOpen(isOpen));

  const toggleBotSelectionAction = (botId: number) => dispatch(toggleBotSelection(botId));

  const setSelectedBotIdsAction = (botIds: number[]) => dispatch(setSelectedBotIds(botIds));

  const jumpToLatestMessages = () => {
    if (!activeChat) return;
    dispatch(resetToLatest(makeChatKey(activeChat.bot_id, activeChat.tg_chat_id)));
    return dispatch(fetchDirectMessagesThunk({
      botId: activeChat.bot_id,
      tgChatId: activeChat.tg_chat_id,
      skip: 0,
      limit: 50,
    }));
  };

  return {
    chatsById,
    chatOrder,
    chats,
    chatsLoading,
    chatsError,
    chatsHasMore,
    activeChatId,
    activeChat,
    pinnedChats,
    unpinnedChats,
    sendingMessage,
    chatSort,
    chatUnreadFilter,
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
    setSelectedBotIds: setSelectedBotIdsAction,
  };
}

export function useDirectMessages(chatKey: string) {
  const messages = useAppSelector(selectDirectMessages(chatKey));
  const loading = useAppSelector(selectDirectMessagesLoading(chatKey));
  const hasMore = useAppSelector(selectDirectMessagesHasMore(chatKey));
  const hasNewer = useAppSelector(selectDirectMessagesHasNewer(chatKey));
  const isDetached = useAppSelector(selectDirectMessagesDetached(chatKey));

  return { messages, loading, hasMore, hasNewer, isDetached };
}
