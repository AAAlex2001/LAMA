import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { InboxEventResponse } from './thunks/inboxEvents';

export const selectInbox = (s: RootState) => s.inbox;

export const selectInboxItems = createSelector(
  [(s: RootState) => s.inbox.items],
  (items) => items,
);

export const selectInboxItemsLoading = createSelector(
  [(s: RootState) => s.inbox.itemsLoading],
  (loading) => loading,
);

export const selectInboxItemsError = createSelector(
  [(s: RootState) => s.inbox.itemsError],
  (error) => error,
);

export const selectInboxItemsTotal = createSelector(
  [(s: RootState) => s.inbox.itemsTotal],
  (total) => total,
);

export const selectInboxItemsHasMore = createSelector(
  [(s: RootState) => s.inbox.itemsHasMore],
  (hasMore) => hasMore,
);

export const selectInboxItemsOffset = createSelector(
  [(s: RootState) => s.inbox.itemsOffset],
  (offset) => offset,
);

export const selectBulkActionLoading = createSelector(
  [(s: RootState) => s.inbox.bulkActionLoading],
  (loading) => loading,
);

export const selectSpecificActionLoading = createSelector(
  [(s: RootState) => s.inbox.specificActionLoading],
  (loading) => loading,
);

export const selectSelectedFilter = createSelector(
  [(s: RootState) => s.inbox.selectedFilter],
  (filter) => filter,
);

export const selectSortDir = createSelector(
  [(s: RootState) => s.inbox.sortDir],
  (sortDir) => sortDir,
);

export const selectStatusFilter = createSelector(
  [(s: RootState) => s.inbox.statusFilter],
  (statusFilter) => statusFilter,
);

export const selectFilteredItems = createSelector(
  [
    (s: RootState) => s.inbox.items,
    (s: RootState) => s.inbox.selectedFilter,
  ],
  (items, filter): InboxEventResponse[] => {
    if (filter === 'all') {
      return items;
    }
    return items.filter((item) => item.category === filter);
  },
);

export const selectSortedItems = createSelector(
  [
    selectFilteredItems,
    (s: RootState) => s.inbox.sort,
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

export const selectChannels = createSelector(
  [(s: RootState) => s.channels.channels],
  (channels) => channels,
);

export const selectChannelsLoading = createSelector(
  [(s: RootState) => s.channels.loading],
  (loading) => loading,
);

export const selectChannelsPagination = createSelector(
  [
    (s: RootState) => s.channels.total,
  ],
  (total) => ({ total }),
);

export const selectInviteLinks = (channelId: number) => createSelector(
  [(s: RootState) => s.inbox.inviteLinks],
  (inviteLinks) => inviteLinks[channelId] || [],
);

export const selectInviteLinksTotal = (channelId: number) => createSelector(
  [(s: RootState) => s.inbox.inviteLinksTotal],
  (inviteLinksTotal) => inviteLinksTotal[channelId] || 0,
);

export const selectInviteLinksLoading = (channelId: number) => createSelector(
  [(s: RootState) => s.inbox.inviteLinksLoading],
  (inviteLinksLoading) => inviteLinksLoading[channelId] || false,
);

export const selectBots = createSelector(
  [(s: RootState) => s.bots.bots],
  (bots) => bots,
);

export const selectBotsLoading = createSelector(
  [(s: RootState) => s.bots.loading],
  (loading) => loading,
);

export const selectDirectChats = createSelector(
  [(s: RootState) => s.directChat.chats],
  (chats) => chats,
);

export const selectDirectChatsLoading = createSelector(
  [(s: RootState) => s.directChat.chatsLoading],
  (loading) => loading,
);

export const selectDirectChatsError = createSelector(
  [(s: RootState) => s.directChat.chatsError],
  (error) => error,
);

export const selectActiveChatId = createSelector(
  [(s: RootState) => s.directChat.activeChatId],
  (id) => id,
);

export const selectActiveChat = createSelector(
  [
    (s: RootState) => s.directChat.chats,
    (s: RootState) => s.directChat.activeChatId,
  ],
  (chats, activeChatId) => {
    if (activeChatId === null) return null;
    return chats.find((c) => c.id === activeChatId) || null;
  },
);

export const selectPinnedChats = createSelector(
  [(s: RootState) => s.directChat.chats],
  (chats) => chats.filter((c) => c.is_pinned),
);

export const selectUnpinnedChats = createSelector(
  [(s: RootState) => s.directChat.chats],
  (chats) => chats.filter((c) => !c.is_pinned),
);

export const selectDirectMessages = (tgChatId: number) => createSelector(
  [(s: RootState) => s.directChat.messages],
  (messages) => {
    const chatMessages = messages[tgChatId] || [];
    return [...chatMessages].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  },
);

export const selectDirectMessagesLoading = (tgChatId: number) => createSelector(
  [(s: RootState) => s.directChat.messagesLoading],
  (loading) => loading[tgChatId] || false,
);

export const selectDirectMessagesHasMore = (tgChatId: number) => createSelector(
  [(s: RootState) => s.directChat.messagesHasMore],
  (hasMore) => hasMore[tgChatId] || false,
);

export const selectSendingMessage = createSelector(
  [(s: RootState) => s.directChat.sendingMessage],
  (sending) => sending,
);

export const selectWsConnected = createSelector(
  [(s: RootState) => s.directChat.wsConnected],
  (connected) => connected,
);