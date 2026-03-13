import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { InboxEventResponse } from './thunks/inboxEvents';
import type { InboxState } from './slices/inbox';
import type { DirectChatResponse, BotMessageResponse } from './thunks/directChat';

export const selectInbox = (s: RootState): InboxState => s.inbox;

export const selectInboxItems = (s: RootState): InboxEventResponse[] => s.inbox.items;

export const selectInboxItemsLoading = (s: RootState): boolean => s.inbox.itemsLoading;

export const selectInboxItemsError = (s: RootState): string | null => s.inbox.itemsError;

export const selectInboxItemsTotal = (s: RootState): number => s.inbox.itemsTotal;

export const selectInboxItemsHasMore = (s: RootState): boolean => s.inbox.itemsHasMore;

export const selectInboxItemsOffset = (s: RootState): number => s.inbox.itemsOffset;

export const selectBulkActionLoading = (s: RootState): boolean => s.inbox.bulkActionLoading;

export const selectSpecificActionLoading = (s: RootState): boolean => s.inbox.specificActionLoading;

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

export const selectFilteredItems = createSelector(
  [
    (s: RootState): InboxEventResponse[] => s.inbox.items,
    (s: RootState): InboxState['selectedFilter'] => s.inbox.selectedFilter,
  ],
  (items, filter): InboxEventResponse[] => {
    if (filter === 'all') {
      return items;
    }
    return items.filter((item: InboxEventResponse) => item.category === filter);
  },
);

export const selectSortedItems = createSelector(
  [
    selectFilteredItems,
    (s: RootState): InboxState['sort'] => s.inbox.sort,
  ],
  (items, sort): InboxEventResponse[] => {
    if (!sort) {
      return items;
    }

    const sorted = [...items];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sort.field) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'username':
          aValue = a.tg_username || '';
          bValue = b.tg_username || '';
          break;
        case 'event_type':
          aValue = a.event_type;
          bValue = b.event_type;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  },
);

export const selectChannels = (s: RootState) => s.channels.channels;

export const selectChannelsLoading = (s: RootState) => s.channels.loading;

export const selectChannelsPagination = createSelector(
  [
    (s: RootState) => s.channels.total,
  ],
  (total) => ({ total }),
);

export const selectInviteLinks = (channelId: number) => createSelector(
  [(s: RootState): InboxState['inviteLinks'] => s.inbox.inviteLinks],
  (inviteLinks) => inviteLinks[channelId] || [],
);

export const selectInviteLinksTotal = (channelId: number) => createSelector(
  [(s: RootState): InboxState['inviteLinksTotal'] => s.inbox.inviteLinksTotal],
  (inviteLinksTotal) => inviteLinksTotal[channelId] || 0,
);

export const selectInviteLinksLoading = (channelId: number) => createSelector(
  [(s: RootState): InboxState['inviteLinksLoading'] => s.inbox.inviteLinksLoading],
  (inviteLinksLoading) => inviteLinksLoading[channelId] || false,
);

export const selectBots = (s: RootState) => s.bots.bots;

export const selectBotsLoading = (s: RootState) => s.bots.loading;

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

export const selectDirectMessages = (chatKey: string) => createSelector(
  [(s: RootState) => s.directChat.messages],
  (messages): BotMessageResponse[] => {
    const chat = messages[chatKey];
    if (!chat) return [];
    return chat.order
      .map((id) => chat.byId[id])
      .filter(Boolean) as BotMessageResponse[];
  },
);

export const selectDirectMessagesLoading = (chatKey: string) => createSelector(
  [(s: RootState) => s.directChat.messagesLoading],
  (loading) => loading[chatKey] || false,
);

export const selectDirectMessagesHasMore = (chatKey: string) => createSelector(
  [(s: RootState) => s.directChat.messagesHasMore],
  (hasMore) => hasMore[chatKey] || false,
);

export const selectDirectMessagesDetached = (chatKey: string) => createSelector(
  [(s: RootState) => s.directChat.messagesDetached],
  (detached) => detached[chatKey] || false,
);

export const selectSendingMessage = (s: RootState) => s.directChat.sendingMessage;

export const selectWsConnected = (s: RootState) => s.directChat.wsConnected;

export const selectReplyToMessageId = (s: RootState) => s.directChat.replyToMessageId;

export const selectBotAutomatizationModalOpen = (s: RootState) => s.directChat.isBotAutomatizationModalOpen;
export const selectTriggerModalOpen = (s: RootState) => s.directChat.isTriggerModalOpen;
export const selectGlobalMessageModalOpen = (s: RootState) => s.directChat.isGlobalMessageModalOpen;
export const selectSelectedBotIds = (s: RootState) => s.directChat.selectedBotIds;

export const selectGlobalMessageIsLoading = (s: RootState) => s.createGlobalMessageModal.isLoading;