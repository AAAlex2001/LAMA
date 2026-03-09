import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InviteLink } from '../types';
import {
  fetchInboxEventsThunk,
  bulkInboxActionThunk,
  specificInboxActionThunk,
} from '../thunks/inboxEvents';
import type {
  InboxEventResponse,
  EventStatus as BackendEventStatus,
} from '../thunks/inboxEvents';

export type InboxView = 'list' | 'direct';

export type SortInput = {
  field: string;
  direction: 'asc' | 'desc';
} | null;

export type ListFilterType = 'all' | 'moderation' | 'system' | 'automation';

export interface InboxState {
  items: InboxEventResponse[];
  itemsLoading: boolean;
  itemsError: string | null;
  itemsTotal: number;
  itemsOffset: number;
  itemsHasMore: boolean;

  selectedFilter: ListFilterType;
  currentView: InboxView;
  sort: SortInput;
  sortDir: 'new' | 'old';
  statusFilter: 'new' | 'processed' | 'ignored' | null;
  eventTypeFilter: 'system_autoreply' | 'system_trigger' | 'bot_command' | null;
  entityIds: number[] | null;
  search: string | null;

  bulkActionLoading: boolean;
  specificActionLoading: boolean;

  inviteLinks: Record<number, InviteLink[]>;
  inviteLinksTotal: Record<number, number>;
  inviteLinksLoading: Record<number, boolean>;
}

const initialState: InboxState = {
  items: [],
  itemsLoading: true,
  itemsError: null,
  itemsTotal: 0,
  itemsOffset: 0,
  itemsHasMore: true,

  selectedFilter: 'all',
  currentView: 'list',
  sort: null,
  sortDir: 'new',
  statusFilter: null,
  eventTypeFilter: null,
  entityIds: null,
  search: null,

  bulkActionLoading: false,
  specificActionLoading: false,

  inviteLinks: {},
  inviteLinksTotal: {},
  inviteLinksLoading: {},
};

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    setSelectedFilter(state, action: PayloadAction<ListFilterType>) {
      if (state.selectedFilter !== action.payload) {
        state.selectedFilter = action.payload;
        state.eventTypeFilter = null;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    setCurrentView(state, action: PayloadAction<InboxView>) {
      state.currentView = action.payload;
    },
    setSort(state, action: PayloadAction<SortInput>) {
      state.sort = action.payload;
    },
    setSortDir(state, action: PayloadAction<'new' | 'old'>) {
      if (state.sortDir !== action.payload) {
        state.sortDir = action.payload;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    setStatusFilter(state, action: PayloadAction<'new' | 'processed' | 'ignored' | null>) {
      if (state.statusFilter !== action.payload) {
        state.statusFilter = action.payload;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    setEventTypeFilter(state, action: PayloadAction<'system_autoreply' | 'system_trigger' | 'bot_command' | null>) {
      if (state.eventTypeFilter !== action.payload) {
        state.eventTypeFilter = action.payload;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    setEntityIds(state, action: PayloadAction<number[] | null>) {
      const newEntityIds = action.payload;
      const currentIds = state.entityIds;
      const idsChanged = JSON.stringify(newEntityIds?.sort()) !== JSON.stringify(currentIds?.sort());
      if (idsChanged) {
        state.entityIds = newEntityIds;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    setSearch(state, action: PayloadAction<string | null>) {
      const newSearch = action.payload;
      if (state.search !== newSearch) {
        state.search = newSearch;
        state.items = [];
        state.itemsOffset = 0;
        state.itemsHasMore = true;
      }
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateItem(state, action: PayloadAction<InboxEventResponse>) {
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchInboxEventsThunk.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchInboxEventsThunk.fulfilled, (state, action) => {
        state.itemsLoading = false;
        const { offset = 0, limit = 50 } = action.meta.arg;
        const response = action.payload;

        if (offset > 0) {
          const existingIds = new Set(state.items.map((i) => i.id));
          const newItems = response.items.filter((i) => !existingIds.has(i.id));
          state.items = [...state.items, ...newItems];
        } else {
          state.items = response.items;
        }

        state.itemsTotal = response.total;
        state.itemsOffset = offset + response.items.length;
        state.itemsHasMore = response.items.length >= limit;
      })
      .addCase(fetchInboxEventsThunk.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload as string;
      });

    builder
      .addCase(bulkInboxActionThunk.pending, (state) => {
        state.bulkActionLoading = true;
      })
      .addCase(bulkInboxActionThunk.fulfilled, (state, action) => {
        state.bulkActionLoading = false;
        const { params } = action.payload;

        if (params.action === 'delete') {
          if (params.apply_to_all) {
            state.items = [];
          } else {
            const idsToRemove = new Set(params.event_ids);
            state.items = state.items.filter((item) => !idsToRemove.has(item.id));
          }
        } else if (params.action === 'read' || params.action === 'ignore') {
          const idsToUpdate = new Set(params.event_ids);
          const newStatus: BackendEventStatus = params.action === 'read' ? 'processed' : 'ignored';
          state.items = state.items.map((item) =>
            idsToUpdate.has(item.id) || params.apply_to_all
              ? { ...item, status: newStatus, is_new: false }
              : item
          );
        }
      })
      .addCase(bulkInboxActionThunk.rejected, (state) => {
        state.bulkActionLoading = false;
      });

    builder
      .addCase(specificInboxActionThunk.pending, (state) => {
        state.specificActionLoading = true;
      })
      .addCase(specificInboxActionThunk.fulfilled, (state, action) => {
        state.specificActionLoading = false;
        const { eventId } = action.payload;
        const item = state.items.find((i) => i.id === eventId);
        if (item) {
          item.status = 'processed';
          item.is_new = false;
        }
      })
      .addCase(specificInboxActionThunk.rejected, (state) => {
        state.specificActionLoading = false;
      });
  },
});

export const {
  setSelectedFilter,
  setCurrentView,
  setSort,
  setSortDir,
  setStatusFilter,
  setEventTypeFilter,
  setEntityIds,
  setSearch,
  removeItem,
  updateItem,
  addInviteLink,
  setInviteLinksLoading,
  setInviteLinks,
  updateInviteLink,
  removeInviteLink,
} = inboxSlice.actions;

export default inboxSlice.reducer;
