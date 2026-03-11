import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchDirectChatsThunk,
  fetchDirectMessagesThunk,
  updateDirectChatThunk,
  editDirectMessageThunk,
  deleteDirectMessageThunk,
} from '../thunks/directChat';
import type {
  DirectChatResponse,
  BotMessageResponse,
} from '../thunks/directChat';

export type { DirectChatResponse, BotMessageResponse };

export interface DirectChatState {
  chats: DirectChatResponse[];
  chatsLoading: boolean;
  chatsError: string | null;
  chatsTotal: number;
  chatsHasMore: boolean;

  chatSort: 'new' | 'old';
  chatUnreadFilter: 'unread' | 'read' | null;

  activeChatId: number | null;
  replyToMessageId: number | null;

  messages: Record<number, BotMessageResponse[]>;
  messagesLoading: Record<number, boolean>;
  messagesError: Record<number, string | null>;
  messagesTotalCount: Record<number, number>;
  messagesHasMore: Record<number, boolean>;
  /** Whether the loaded messages are detached from the latest (viewing around a specific message) */
  messagesDetached: Record<number, boolean>;

  sendingMessage: boolean;
  wsConnected: boolean;

  isBotAutomatizationModalOpen: boolean;
  isTriggerModalOpen: boolean;
  isGlobalMessageModalOpen: boolean;
  selectedBotIds: number[];
}

const initialState: DirectChatState = {
  chats: [],
  chatsLoading: false,
  chatsError: null,
  chatsTotal: 0,
  chatsHasMore: true,

  chatSort: 'new',
  chatUnreadFilter: null,

  activeChatId: null,
  replyToMessageId: null,

  messages: {},
  messagesLoading: {},
  messagesError: {},
  messagesTotalCount: {},
  messagesHasMore: {},
  messagesDetached: {},

  sendingMessage: false,
  wsConnected: false,

  isBotAutomatizationModalOpen: false,
  isTriggerModalOpen: false,
  isGlobalMessageModalOpen: false,
  selectedBotIds: [],
};

const directChatSlice = createSlice({
  name: 'directChat',
  initialState,
  reducers: {
    setActiveChatId(state, action: PayloadAction<number | null>) {
      state.activeChatId = action.payload;
    },
    setChatSort(state, action: PayloadAction<'new' | 'old'>) {
      if (state.chatSort !== action.payload) {
        state.chatSort = action.payload;
        state.chats = [];
        state.chatsTotal = 0;
        state.chatsHasMore = true;
      }
    },
    setChatUnreadFilter(state, action: PayloadAction<'unread' | 'read' | null>) {
      if (state.chatUnreadFilter !== action.payload) {
        state.chatUnreadFilter = action.payload;
        state.chats = [];
        state.chatsTotal = 0;
        state.chatsHasMore = true;
      }
    },
    clearMessages(state, action: PayloadAction<number>) {
      const chatId = action.payload;
      delete state.messages[chatId];
      delete state.messagesLoading[chatId];
      delete state.messagesError[chatId];
      delete state.messagesTotalCount[chatId];
      delete state.messagesHasMore[chatId];
      delete state.messagesDetached[chatId];
    },
    /** Clear messages and exit detached mode, preparing for a fresh latest-messages fetch */
    resetToLatest(state, action: PayloadAction<number>) {
      const tgChatId = action.payload;
      state.messages[tgChatId] = [];
      state.messagesDetached[tgChatId] = false;
      state.messagesHasMore[tgChatId] = true;
    },
    wsMessageReceived(state, action: PayloadAction<{ tgChatId: number; message: BotMessageResponse }>) {
      const { tgChatId, message } = action.payload;
      if (!state.messages[tgChatId]) {
        state.messages[tgChatId] = [];
      }
      const exists = state.messages[tgChatId].some((m) => m.id === message.id);
      if (!exists) {
        const messages = state.messages[tgChatId];
        const messageTime = new Date(message.created_at).getTime();
        let insertIndex = messages.length;
        for (let i = 0; i < messages.length; i++) {
          const msgTime = new Date(messages[i].created_at).getTime();
          if (messageTime > msgTime) {
            insertIndex = i;
            break;
          }
        }
        messages.splice(insertIndex, 0, message);
      } else {
        const idx = state.messages[tgChatId].findIndex((m) => m.id === message.id);
        if (idx !== -1) {
          state.messages[tgChatId][idx] = message;
          state.messages[tgChatId].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeB - timeA;
          });
        }
      }
      const chat = state.chats.find((c) => c.tg_chat_id === tgChatId);
      if (chat) {
        chat.last_message_preview = message.text_content || '';
        chat.last_message_at = message.created_at;
        if (message.is_incoming) {
          chat.unread_count += 1;
        }
      }
    },
    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
    },
    setSendingMessage(state, action: PayloadAction<boolean>) {
      state.sendingMessage = action.payload;
    },
    setReplyToMessageId(state, action: PayloadAction<number | null>) {
      state.replyToMessageId = action.payload;
    },
    setBotAutomatizationModalOpen(state, action: PayloadAction<boolean>) {
      state.isBotAutomatizationModalOpen = action.payload;
      if (!action.payload) {
        state.selectedBotIds = [];
      }
    },
    setTriggerModalOpen(state, action: PayloadAction<boolean>) {
      state.isTriggerModalOpen = action.payload;
    },
    setGlobalMessageModalOpen(state, action: PayloadAction<boolean>) {
      state.isGlobalMessageModalOpen = action.payload;
    },
    setSelectedBotIds(state, action: PayloadAction<number[]>) {
      state.selectedBotIds = action.payload;
    },
    toggleBotSelection(state, action: PayloadAction<number>) {
      const botId = action.payload;
      const index = state.selectedBotIds.indexOf(botId);
      if (index === -1) {
        state.selectedBotIds.push(botId);
      } else {
        state.selectedBotIds.splice(index, 1);
      }
    },
    selectAllBots(state, action: PayloadAction<number[]>) {
      state.selectedBotIds = action.payload;
    },
    resetDirectChat() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDirectChatsThunk.pending, (state) => {
        state.chatsLoading = true;
        state.chatsError = null;
      })
      .addCase(fetchDirectChatsThunk.fulfilled, (state, action) => {
        state.chatsLoading = false;
        const { skip = 0, limit = 50 } = action.meta.arg;
        const response = action.payload;

        if (skip > 0) {
          const existingIds = new Set(state.chats.map((c) => c.id));
          const newChats = response.items.filter((c) => !existingIds.has(c.id));
          state.chats = [...state.chats, ...newChats];
        } else {
          state.chats = response.items;
        }

        state.chatsTotal = response.total;
        state.chatsHasMore = response.items.length >= limit;
      })
      .addCase(fetchDirectChatsThunk.rejected, (state, action) => {
        state.chatsLoading = false;
        state.chatsError = action.payload as string;
      });

    builder
      .addCase(fetchDirectMessagesThunk.pending, (state, action) => {
        const key = action.meta.arg.tgChatId;
        state.messagesLoading[key] = true;
        state.messagesError[key] = null;
      })
      .addCase(fetchDirectMessagesThunk.fulfilled, (state, action) => {
        const { tgChatId, skip = 0, limit = 50, around_message_id, jumpToMessage } = action.meta.arg;
        state.messagesLoading[tgChatId] = false;
        const response = action.payload;
        const sortDesc = (a: BotMessageResponse, b: BotMessageResponse) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        };

        if (jumpToMessage && around_message_id) {
          // Merge around-window with existing (keeps mounted DOM nodes, prevents UI jumps)
          const existing = state.messages[tgChatId] || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const newMessages = response.items.filter((m) => !existingIds.has(m.id));
          state.messages[tgChatId] = [...existing, ...newMessages].sort(sortDesc);
          state.messagesDetached[tgChatId] = true;
          state.messagesHasMore[tgChatId] = true;
        } else if (skip === 0 && !around_message_id) {
          if (state.messagesDetached[tgChatId]) {
            // WS-triggered refetch while detached — skip to preserve the around-window
            state.messagesTotalCount[tgChatId] = response.total;
            return;
          }
          // Normal initial load or refresh
          state.messages[tgChatId] = [...response.items].sort(sortDesc);
          state.messagesDetached[tgChatId] = false;
          state.messagesHasMore[tgChatId] = response.items.length >= limit;
        } else {
          // Merge: load more (skip > 0) or around_message_id without jumpToMessage
          const existing = state.messages[tgChatId] || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const newMessages = response.items.filter((m) => !existingIds.has(m.id));
          state.messages[tgChatId] = [...existing, ...newMessages].sort(sortDesc);

          if (around_message_id) {
            // Loading more while detached: no more if no new messages were added
            state.messagesHasMore[tgChatId] = newMessages.length > 0;
          } else {
            state.messagesHasMore[tgChatId] = response.items.length >= limit;
          }
        }

        state.messagesTotalCount[tgChatId] = response.total;
      })
      .addCase(fetchDirectMessagesThunk.rejected, (state, action) => {
        const key = action.meta.arg.tgChatId;
        state.messagesLoading[key] = false;
        state.messagesError[key] = action.payload as string;
      });

    builder
      .addCase(updateDirectChatThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.chats.findIndex((c) => c.id === updated.id);
        if (idx !== -1) {
          state.chats[idx] = updated;
        }
      });

    builder
      .addCase(editDirectMessageThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        for (const key of Object.keys(state.messages)) {
          const chatMessages = state.messages[Number(key)];
          const idx = chatMessages.findIndex((m) => m.id === updated.id);
          if (idx !== -1) {
            chatMessages[idx] = updated;
            chatMessages.sort((a, b) => {
              const timeA = new Date(a.created_at).getTime();
              const timeB = new Date(b.created_at).getTime();
              return timeB - timeA;
            });
            break;
          }
        }
      });

    builder
      .addCase(deleteDirectMessageThunk.fulfilled, (state, action) => {
        const { messageId, chatId } = action.payload;
        if (state.messages[chatId]) {
          state.messages[chatId] = state.messages[chatId].filter((m) => m.id !== messageId);
        } else {
          for (const key of Object.keys(state.messages)) {
            const msgs = state.messages[Number(key)];
            const idx = msgs.findIndex((m) => m.id === messageId);
            if (idx !== -1) {
              msgs.splice(idx, 1);
              break;
            }
          }
        }
      });
  },
});

export const {
  setActiveChatId,
  setChatSort,
  setChatUnreadFilter,
  clearMessages,
  resetToLatest,
  wsMessageReceived,
  setWsConnected,
  setSendingMessage,
  setReplyToMessageId,
  setBotAutomatizationModalOpen,
  setTriggerModalOpen,
  setGlobalMessageModalOpen,
  setSelectedBotIds,
  toggleBotSelection,
  selectAllBots,
  resetDirectChat,
} = directChatSlice.actions;

export default directChatSlice.reducer;
