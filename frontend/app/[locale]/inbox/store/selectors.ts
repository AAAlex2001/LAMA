import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { InboxEventResponse } from './thunks/inboxEvents';
import type { InboxState } from './slices/inbox';

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

export const selectStatusFilter = (s: RootState): 'new' | 'processed' | 'ignored' | null => s.inbox.statusFilter;

export const selectEventTypeFilter = (s: RootState): 'system_autoreply' | 'system_trigger' | 'bot_command' | null => s.inbox.eventTypeFilter;

export const selectEntityIds = (s: RootState): number[] | null => s.inbox.entityIds;

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

export const selectDirectChats = (s: RootState) => s.directChat.chats;

export const selectDirectChatsLoading = (s: RootState) => s.directChat.chatsLoading;

export const selectDirectChatsError = (s: RootState) => s.directChat.chatsError;

export const selectDirectChatsHasMore = (s: RootState) => s.directChat.chatsHasMore;

export const selectDirectChatsTotal = (s: RootState) => s.directChat.chatsTotal;

export const selectChatSort = (s: RootState) => s.directChat.chatSort;

export const selectChatUnreadFilter = (s: RootState) => s.directChat.chatUnreadFilter;

export const selectActiveChatId = (s: RootState) => s.directChat.activeChatId;

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

export const selectSendingMessage = (s: RootState) => s.directChat.sendingMessage;

export const selectWsConnected = (s: RootState) => s.directChat.wsConnected;

export const selectReplyToMessageId = (s: RootState) => s.directChat.replyToMessageId;

export const selectBotAutomatizationModalOpen = (s: RootState) => s.directChat.isBotAutomatizationModalOpen;
export const selectTriggerModalOpen = (s: RootState) => s.directChat.isTriggerModalOpen;
export const selectGlobalMessageModalOpen = (s: RootState) => s.directChat.isGlobalMessageModalOpen;
export const selectSelectedBotIds = (s: RootState) => s.directChat.selectedBotIds;

export const selectGlobalMessageIsLoading = (s: RootState) => s.createGlobalMessageModal.isLoading;