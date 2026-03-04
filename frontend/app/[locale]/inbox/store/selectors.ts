import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { IInboxItem } from '../components/InboxList/components/ListElement';
import type { ListHeaderType } from '../components/InboxList/components/ListHeader';

export const selectInbox = (s: RootState) => s.inbox;

export const selectFilteredItems = createSelector(
  [
    (s: RootState) => s.inbox.items,
    (s: RootState) => s.inbox.selectedFilter,
  ],
  (items, filter): IInboxItem[] => {
    if (filter === 'all') {
      return items;
    }
    
    switch (filter) {
      case 'moderation':
        return items.filter((item) => 
          item.eventType === 'application' || 
          item.eventType === 'comment' || 
          item.eventType === 'message'
        );
      case 'system':
        return items.filter((item) => 
          item.type === 'system' || 
          item.eventType === 'notification' || 
          item.eventType === 'trigger'
        );
      case 'automation':
        return items.filter((item) => 
          item.eventType === 'auto-reply' || 
          item.eventType === 'trigger' || 
          item.eventType === 'command'
        );
      default:
        return items;
    }
  },
);

export const selectSortedItems = createSelector(
  [
    selectFilteredItems,
    (s: RootState) => s.inbox.sort,
  ],
  (items, sort): IInboxItem[] => {
    if (!sort) {
      return items;
    }

    const sorted = [...items];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'username':
          aValue = a.username || '';
          bValue = b.username || '';
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
