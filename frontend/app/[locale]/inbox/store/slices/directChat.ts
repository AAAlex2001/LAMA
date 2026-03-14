import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchDirectChatsThunk,
  fetchMoreDirectChatsThunk,
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

export function makeChatKey(botId: number, tgChatId: number): string {
  return `${botId}_${tgChatId}`;
}

export interface ChatMessages {
  byId: Record<number, BotMessageResponse>;
  order: number[];
}

function emptyChatMessages(): ChatMessages {
  return { byId: {}, order: [] };
}

function sortOrderDesc(chat: ChatMessages): void {
  chat.order.sort((a, b) => {
    const timeA = new Date(chat.byId[a].created_at).getTime();
    const timeB = new Date(chat.byId[b].created_at).getTime();
    return timeB - timeA;
  });
}

function fromArray(messages: BotMessageResponse[]): ChatMessages {
  const result = emptyChatMessages();
  for (const msg of messages) {
    result.byId[msg.id] = msg;
    result.order.push(msg.id);
  }
  sortOrderDesc(result);
  return result;
}

function mergeInto(chat: ChatMessages, incoming: BotMessageResponse[]): number {
  let newCount = 0;
  for (const msg of incoming) {
    if (!(msg.id in chat.byId)) {
      newCount++;
      chat.order.push(msg.id);
    }
    chat.byId[msg.id] = msg;
  }
  sortOrderDesc(chat);
  return newCount;
}

export interface DirectChatState {
  chatsById: Record<string, DirectChatResponse>;
  chatOrder: string[];
  chatsLoading: boolean;
  chatsError: string | null;
  chatsTotal: number;
  chatsHasMore: boolean;

  chatSort: 'new' | 'old';
  chatUnreadFilter: 'unread' | 'read' | null;

  activeChatId: string | null;
  replyToMessageId: number | null;

  messages: Record<string, ChatMessages>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  messagesTotalCount: Record<string, number>;
  messagesHasMore: Record<string, boolean>;
  messagesHasNewer: Record<string, boolean>;
  messagesDetached: Record<string, boolean>;

  sendingMessage: boolean;
  wsConnected: boolean;

  isBotAutomatizationModalOpen: boolean;
  isTriggerModalOpen: boolean;
  isGlobalMessageModalOpen: boolean;
  selectedBotIds: number[];
}

const initialState: DirectChatState = {
  chatsById: {},
  chatOrder: [],
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
  messagesHasNewer: {},
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
    setActiveChatId(state, action: PayloadAction<string | null>) {
      state.activeChatId = action.payload;
    },
    setChatSort(state, action: PayloadAction<'new' | 'old'>) {
      if (state.chatSort !== action.payload) {
        state.chatSort = action.payload;
        state.chatsById = {};
        state.chatOrder = [];
        state.chatsTotal = 0;
        state.chatsHasMore = true;
      }
    },
    setChatUnreadFilter(state, action: PayloadAction<'unread' | 'read' | null>) {
      if (state.chatUnreadFilter !== action.payload) {
        state.chatUnreadFilter = action.payload;
        state.chatsById = {};
        state.chatOrder = [];
        state.chatsTotal = 0;
        state.chatsHasMore = true;
      }
    },
    clearMessages(state, action: PayloadAction<string>) {
      const chatKey = action.payload;
      delete state.messages[chatKey];
      delete state.messagesLoading[chatKey];
      delete state.messagesError[chatKey];
      delete state.messagesTotalCount[chatKey];
      delete state.messagesHasMore[chatKey];
      delete state.messagesHasNewer[chatKey];
      delete state.messagesDetached[chatKey];
    },

    resetToLatest(state, action: PayloadAction<string>) {
      const chatKey = action.payload;
      state.messages[chatKey] = emptyChatMessages();
      state.messagesDetached[chatKey] = false;
      state.messagesHasMore[chatKey] = true;
      state.messagesHasNewer[chatKey] = false;
    },
    
    wsMessageReceived(state, action: PayloadAction<{ chatKey: string; message: BotMessageResponse }>) {
      const { chatKey, message } = action.payload;
      if (!state.messages[chatKey]) {
        state.messages[chatKey] = emptyChatMessages();
      }

      const chat = state.messages[chatKey];
      const exists = message.id in chat.byId;

      chat.byId[message.id] = message;

      if (!exists) {
        const messageTime = new Date(message.created_at).getTime();
        let insertIndex = chat.order.length;
        for (let i = 0; i < chat.order.length; i++) {
          const existing = chat.byId[chat.order[i]];
          if (existing && new Date(existing.created_at).getTime() < messageTime) {
            insertIndex = i;
            break;
          }
        }
        chat.order.splice(insertIndex, 0, message.id);
      }
      const chatEntry = state.chatsById[chatKey];
      if (chatEntry) {
        chatEntry.last_message_preview = message.text_content || '';
        chatEntry.last_message_at = message.created_at;
        if (message.is_incoming) {
          chatEntry.unread_count += 1;
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
          for (const chat of response.items) {
            const key = makeChatKey(chat.bot_id, chat.tg_chat_id);
            if (!state.chatsById[key]) {
              state.chatsById[key] = chat;
              state.chatOrder.push(key);
            }
          }
        } else {
          state.chatsById = {};
          state.chatOrder = [];
          for (const chat of response.items) {
            const key = makeChatKey(chat.bot_id, chat.tg_chat_id);
            state.chatsById[key] = chat;
            state.chatOrder.push(key);
          }
        }

        state.chatsTotal = response.total;
        state.chatsHasMore = response.items.length >= limit;
      })
      .addCase(fetchDirectChatsThunk.rejected, (state, action) => {
        state.chatsLoading = false;
        state.chatsError = action.payload as string;
      });

    builder
      .addCase(fetchMoreDirectChatsThunk.pending, (state) => {
        state.chatsLoading = true;
        state.chatsError = null;
      })
      .addCase(fetchMoreDirectChatsThunk.fulfilled, (state, action) => {
        state.chatsLoading = false;
        const response = action.payload;
        const limit = 50;

        for (const chat of response.items) {
          const key = makeChatKey(chat.bot_id, chat.tg_chat_id);
          if (!state.chatsById[key]) {
            state.chatsById[key] = chat;
            state.chatOrder.push(key);
          }
        }

        state.chatsTotal = response.total;
        state.chatsHasMore = response.items.length >= limit;
      })
      .addCase(fetchMoreDirectChatsThunk.rejected, (state, action) => {
        state.chatsLoading = false;
        state.chatsError = action.payload as string;
      });

    builder
      .addCase(fetchDirectMessagesThunk.pending, (state, action) => {
        const key = makeChatKey(action.meta.arg.botId, action.meta.arg.tgChatId);
        state.messagesLoading[key] = true;
        state.messagesError[key] = null;
      })
      .addCase(fetchDirectMessagesThunk.fulfilled, (state, action) => {
        const { botId, tgChatId, skip = 0, limit = 50, around_message_id, after_message_id, jumpToMessage } = action.meta.arg;
        const chatKey = makeChatKey(botId, tgChatId);
        state.messagesLoading[chatKey] = false;
        const response = action.payload;

        if (jumpToMessage && around_message_id) {
          if (!state.messages[chatKey]) {
            state.messages[chatKey] = emptyChatMessages();
          }
          mergeInto(state.messages[chatKey], response.items);
          state.messagesDetached[chatKey] = true;
          state.messagesHasMore[chatKey] = true;
          state.messagesHasNewer[chatKey] = true;
        } else if (after_message_id) {
          // Loading newer messages in detached mode
          if (!state.messages[chatKey]) {
            state.messages[chatKey] = emptyChatMessages();
          }
          const newCount = mergeInto(state.messages[chatKey], response.items);
          const caughtUp = response.items.length < limit || !response.has_more;
          if (caughtUp) {
            // Reached the latest messages — exit detached mode
            state.messagesDetached[chatKey] = false;
            state.messagesHasNewer[chatKey] = false;
          } else {
            state.messagesHasNewer[chatKey] = newCount > 0;
          }
        } else if (skip === 0 && !around_message_id) {
          if (state.messagesDetached[chatKey]) {
            state.messagesTotalCount[chatKey] = response.total;
            return;
          }
          state.messages[chatKey] = fromArray(response.items);
          state.messagesDetached[chatKey] = false;
          state.messagesHasMore[chatKey] = response.items.length >= limit;
          state.messagesHasNewer[chatKey] = false;
        } else {
          if (!state.messages[chatKey]) {
            state.messages[chatKey] = emptyChatMessages();
          }
          const newCount = mergeInto(state.messages[chatKey], response.items);

          if (around_message_id) {
            state.messagesHasMore[chatKey] = newCount > 0;
          } else {
            state.messagesHasMore[chatKey] = response.items.length >= limit;
          }
        }

        state.messagesTotalCount[chatKey] = response.total;
      })
      .addCase(fetchDirectMessagesThunk.rejected, (state, action) => {
        const key = makeChatKey(action.meta.arg.botId, action.meta.arg.tgChatId);
        state.messagesLoading[key] = false;
        state.messagesError[key] = action.payload as string;
      });

    builder
      .addCase(updateDirectChatThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const key = makeChatKey(updated.bot_id, updated.tg_chat_id);
        if (state.chatsById[key]) {
          state.chatsById[key] = updated;
        }
      });

    builder
      .addCase(editDirectMessageThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        for (const key of Object.keys(state.messages)) {
          const chat = state.messages[key];
          if (updated.id in chat.byId) {
            chat.byId[updated.id] = updated;
            break;
          }
        }
      });

    builder
      .addCase(deleteDirectMessageThunk.fulfilled, (state, action) => {
        const { messageId, botId, chatId } = action.payload;
        const chatKey = makeChatKey(botId, chatId);
        const chat = state.messages[chatKey];

        if (chat && messageId in chat.byId) {
          delete chat.byId[messageId];
          const idx = chat.order.indexOf(messageId);
          if (idx !== -1) chat.order.splice(idx, 1);
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
  resetDirectChat,
} = directChatSlice.actions;

export default directChatSlice.reducer;
