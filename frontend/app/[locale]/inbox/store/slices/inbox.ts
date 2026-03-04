import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IInboxItem } from '../../components/InboxList/components/ListElement';
import type { ListHeaderType } from '../../components/InboxList/components/ListHeader';
import type { InviteLink } from '../types';

export type InboxView = 'list' | 'direct';

export type SortInput = {
  field: string;
  direction: 'asc' | 'desc';
} | null;

export interface InboxState {
  items: IInboxItem[];
  selectedFilter: ListHeaderType;
  currentView: InboxView;
  sort: SortInput;
  inviteLinks: Record<number, InviteLink[]>;
  inviteLinksTotal: Record<number, number>;
  inviteLinksLoading: Record<number, boolean>;
}

const initialState: InboxState = {
  items: [],
  selectedFilter: 'all',
  currentView: 'list',
  sort: null,
  inviteLinks: {},
  inviteLinksTotal: {},
  inviteLinksLoading: {},
};

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    setSelectedFilter(state, action: PayloadAction<ListHeaderType>) {
      state.selectedFilter = action.payload;
    },
    setCurrentView(state, action: PayloadAction<InboxView>) {
      state.currentView = action.payload;
    },
    setSort(state, action: PayloadAction<SortInput>) {
      state.sort = action.payload;
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateItem(state, action: PayloadAction<IInboxItem>) {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    addInviteLink(state, action: PayloadAction<{ channelId: number; inviteLink: InviteLink }>) {
      const { channelId, inviteLink } = action.payload;
      if (!state.inviteLinks[channelId]) {
        state.inviteLinks[channelId] = [];
      }
      state.inviteLinks[channelId].push(inviteLink);
      if (state.inviteLinksTotal[channelId] !== undefined) {
        state.inviteLinksTotal[channelId] += 1;
      }
    },
    setInviteLinksLoading(state, action: PayloadAction<{ channelId: number; loading: boolean }>) {
      const { channelId, loading } = action.payload;
      state.inviteLinksLoading[channelId] = loading;
    },
    setInviteLinks(state, action: PayloadAction<{ channelId: number; inviteLinks: InviteLink[]; total: number }>) {
      const { channelId, inviteLinks, total } = action.payload;
      state.inviteLinks[channelId] = inviteLinks;
      state.inviteLinksTotal[channelId] = total;
    },
    updateInviteLink(state, action: PayloadAction<{ channelId: number; inviteLinkId: number; inviteLink: InviteLink }>) {
      const { channelId, inviteLinkId, inviteLink } = action.payload;
      if (state.inviteLinks[channelId]) {
        const index = state.inviteLinks[channelId].findIndex(link => link.id === inviteLinkId);
        if (index !== -1) {
          state.inviteLinks[channelId][index] = inviteLink;
        }
      }
    },
    removeInviteLink(state, action: PayloadAction<{ channelId: number; inviteLinkId: number }>) {
      const { channelId, inviteLinkId } = action.payload;
      if (state.inviteLinks[channelId]) {
        state.inviteLinks[channelId] = state.inviteLinks[channelId].filter(link => link.id !== inviteLinkId);
        if (state.inviteLinksTotal[channelId] !== undefined && state.inviteLinksTotal[channelId] > 0) {
          state.inviteLinksTotal[channelId] -= 1;
        }
      }
    },
  },
});

export const {
  setSelectedFilter,
  setCurrentView,
  setSort,
  removeItem,
  updateItem,
  addInviteLink,
  setInviteLinksLoading,
  setInviteLinks,
  updateInviteLink,
  removeInviteLink,
} = inboxSlice.actions;

export default inboxSlice.reducer;
