import { useCallback, useEffect, useRef } from 'react';
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

  const chats = useAppSelector(selectDirectChats);
  const chatsLoading = useAppSelector(selectDirectChatsLoading);
  const chatsError = useAppSelector(selectDirectChatsError);
  const activeChatId = useAppSelector(selectActiveChatId);
  const activeChat = useAppSelector(selectActiveChat);
  const pinnedChats = useAppSelector(selectPinnedChats);
  const unpinnedChats = useAppSelector(selectUnpinnedChats);
  const sendingMessage = useAppSelector(selectSendingMessage);

  // Set up WS handlers once
  useEffect(() => {
    if (handlersSetRef.current) return;
    handlersSetRef.current = true;

    directChatWs.setHandlers(
      // onEvent - handle WebSocket events from backend
      (event: WsEvent) => {
        if (event.type === 'message_new') {
          // When a new message is received, refetch messages for that chat
          // This ensures we get the full message data
          dispatch(fetchDirectMessagesThunk({
            botId: event.bot_id,
            tgChatId: event.chat_id,
            skip: 0,
            limit: 50,
          }));
        } else if (event.type === 'message_edited' || event.type === 'message_deleted') {
          // For edited/deleted messages, refetch to get updated state
          dispatch(fetchDirectMessagesThunk({
            botId: event.bot_id,
            tgChatId: event.chat_id,
            skip: 0,
            limit: 50,
          }));
        } else if (event.type === 'chat_updated') {
          // Refetch chats list when a chat is updated
          dispatch(fetchDirectChatsThunk({}));
        }
      },
      // onStatus
      (connected) => {
        dispatch(setWsConnected(connected));
      }
    );

    return () => {
      directChatWs.disconnect();
    };
  }, [dispatch]);

  // Connect/disconnect WS when active chat changes
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
    (params: {
      text_content?: string;
      media_url?: string;
      media_type?: MessageType;
      buttons?: Record<string, unknown>;
    }) => {
      if (!activeChat) {
        console.warn('No active chat, cannot send message');
        return;
      }

      dispatch(setSendingMessage(true));
      
      const sendParams: SendDirectMessageParams = {
        botId: activeChat.bot_id,
        tgChatId: activeChat.tg_chat_id,
        chat_id: activeChat.tg_chat_id, // Backend requires chat_id in the body
        ...params,
      };

      dispatch(sendDirectMessageThunk(sendParams))
        .then((result) => {
          if (sendDirectMessageThunk.fulfilled.match(result)) {
            // Message sent successfully, add it to the messages list
            dispatch(wsMessageReceived({
              tgChatId: activeChat.tg_chat_id,
              message: result.payload,
            }));
          }
          dispatch(setSendingMessage(false));
        })
        .catch(() => {
          dispatch(setSendingMessage(false));
        });
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
  };
}

export function useDirectMessages(tgChatId: number) {
  const messages = useAppSelector(selectDirectMessages(tgChatId));
  const loading = useAppSelector(selectDirectMessagesLoading(tgChatId));
  const hasMore = useAppSelector(selectDirectMessagesHasMore(tgChatId));

  return { messages, loading, hasMore };
}
