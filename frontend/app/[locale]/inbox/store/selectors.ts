import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { InboxState } from './slices/inbox';
import type { DirectChatResponse, BotMessageResponse } from './thunks/directChat';

export const selectInbox = (s: RootState): InboxState => s.inbox;

export const selectSelectedFilter = (s: RootState): InboxState['selectedFilter'] => s.inbox.selectedFilter;

export const selectSortDir = (s: RootState): 'new' | 'old' => s.inbox.sortDir;

export const selectStatusFilter = (s: RootState): 'new' | 'processed' | 'banned' | null => s.inbox.statusFilter;

export const selectBotIds = (s: RootState): number[] | null => s.inbox.botIds;

export const selectChannelIds = (s: RootState): number[] | null => s.inbox.channelIds;

export const selectSystem = (s: RootState): boolean | null => s.inbox.system;

export const selectTypeAutoReplies = (s: RootState): boolean | null => s.inbox.typeAutoReplies;

export const selectTypeTriggers = (s: RootState): boolean | null => s.inbox.typeTriggers;

export const selectTypeCommands = (s: RootState): boolean | null => s.inbox.typeCommands;

export const selectSearch = (s: RootState): string | null => s.inbox.search;

export const selectChatsById = (s: RootState) => s.directChat.chatsById;

export const selectChatOrder = (s: RootState) => s.directChat.chatOrder;

export const selectDirectChats = createSelector(
  [selectChatsById, selectChatOrder],
  (chatsById, chatOrder): DirectChatResponse[] =>
    chatOrder.map((key) => chatsById[key]).filter(Boolean) as DirectChatResponse[],
);

export const selectDirectChatsLoading = (s: RootState) => s.directChat.chatsLoading;

export const selectDirectChatsError = (s: RootState) => s.directChat.chatsError;

export const selectDirectChatsHasMore = (s: RootState) => s.directChat.chatsHasMore;

export const selectDirectChatsTotal = (s: RootState) => s.directChat.chatsTotal;

export const selectChatSort = (s: RootState) => s.directChat.chatSort;

export const selectChatUnreadFilter = (s: RootState) => s.directChat.chatUnreadFilter;

export const selectActiveChatId = (s: RootState) => s.directChat.activeChatId;

export const selectActiveChat = createSelector(
  [selectChatsById, selectActiveChatId],
  (chatsById, activeChatId) => {
    if (activeChatId === null) return null;
    return chatsById[activeChatId] || null;
  },
);

export const selectPinnedChats = createSelector(
  [selectChatsById, selectChatOrder],
  (chatsById, chatOrder): DirectChatResponse[] =>
    chatOrder
      .map((key) => chatsById[key])
      .filter((c): c is DirectChatResponse => !!c && c.is_pinned),
);

export const selectUnpinnedChats = createSelector(
  [selectChatsById, selectChatOrder],
  (chatsById, chatOrder): DirectChatResponse[] =>
    chatOrder
      .map((key) => chatsById[key])
      .filter((c): c is DirectChatResponse => !!c && !c.is_pinned),
);

export const selectDirectMessages = createSelector(
  [(s: RootState) => s.directChat.messages, (_s: RootState, chatKey: string) => chatKey],
  (messages, chatKey): BotMessageResponse[] => {
    const chat = messages[chatKey];
    if (!chat) return [];
    return chat.order
      .map((id) => chat.byId[id])
      .filter(Boolean) as BotMessageResponse[];
  },
);

export const selectDirectMessagesLoading = createSelector(
  [(s: RootState) => s.directChat.messagesLoading, (_s: RootState, chatKey: string) => chatKey],
  (loading, chatKey) => loading[chatKey] || false,
);

export const selectDirectMessagesHasMore = createSelector(
  [(s: RootState) => s.directChat.messagesHasMore, (_s: RootState, chatKey: string) => chatKey],
  (hasMore, chatKey) => hasMore[chatKey] || false,
);

export const selectDirectMessagesHasNewer = createSelector(
  [(s: RootState) => s.directChat.messagesHasNewer, (_s: RootState, chatKey: string) => chatKey],
  (hasNewer, chatKey) => hasNewer[chatKey] || false,
);

export const selectDirectMessagesDetached = createSelector(
  [(s: RootState) => s.directChat.messagesDetached, (_s: RootState, chatKey: string) => chatKey],
  (detached, chatKey) => detached[chatKey] || false,
);

export const selectSendingMessage = (s: RootState) => s.directChat.sendingMessage;

export const selectWsConnected = (s: RootState) => s.directChat.wsConnected;

export const selectReplyToMessageId = (s: RootState) => s.directChat.replyToMessageId;

export const selectBotAutomatizationModalOpen = (s: RootState) => s.directChat.isBotAutomatizationModalOpen;
export const selectTriggerModalOpen = (s: RootState) => s.directChat.isTriggerModalOpen;
export const selectGlobalMessageModalOpen = (s: RootState) => s.directChat.isGlobalMessageModalOpen;
export const selectSelectedBotIds = (s: RootState) => s.directChat.selectedBotIds;

export const selectGlobalMessageIsLoading = (s: RootState) => s.createGlobalMessageModal.isLoading;