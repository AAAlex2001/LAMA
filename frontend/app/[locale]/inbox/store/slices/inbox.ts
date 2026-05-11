import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type InboxView = 'list' | 'direct';

export type SortInput = {
  field: string;
  direction: 'asc' | 'desc';
} | null;

export type ListFilterType = 'all' | 'moderation' | 'system' | 'automation';

export interface InboxState {
  selectedFilter: ListFilterType;
  currentView: InboxView;
  sort: SortInput;
  sortDir: 'new' | 'old';
  statusFilter: 'new' | 'processed' | 'banned' | null;
  botIds: number[] | null;
  channelIds: number[] | null;
  system: boolean | null;
  typeAutoReplies: boolean | null;
  typeTriggers: boolean | null;
  typeCommands: boolean | null;
  search: string | null;
}

const initialState: InboxState = {
  selectedFilter: 'all',
  currentView: 'list',
  sort: null,
  sortDir: 'new',
  statusFilter: null,
  botIds: null,
  channelIds: null,
  system: null,
  typeAutoReplies: null,
  typeTriggers: null,
  typeCommands: null,
  search: null,
};

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    setSelectedFilter(state, action: PayloadAction<ListFilterType>) {
      if (state.selectedFilter !== action.payload) {
        state.selectedFilter = action.payload;
        state.statusFilter = null;
        state.sortDir = 'new';
        state.botIds = null;
        state.channelIds = null;
        state.system = null;
        state.typeAutoReplies = null;
        state.typeTriggers = null;
        state.typeCommands = null;
        state.search = null;
      }
    },
    setCurrentView(state, action: PayloadAction<InboxView>) {
      state.currentView = action.payload;
    },
    setSort(state, action: PayloadAction<SortInput>) {
      state.sort = action.payload;
    },
    setSortDir(state, action: PayloadAction<'new' | 'old'>) {
      state.sortDir = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<'new' | 'processed' | 'banned' | null>) {
      state.statusFilter = action.payload;
    },
    setBotIds(state, action: PayloadAction<number[] | null>) {
      state.botIds = action.payload;
    },
    setChannelIds(state, action: PayloadAction<number[] | null>) {
      state.channelIds = action.payload;
    },
    setSystem(state, action: PayloadAction<boolean | null>) {
      state.system = action.payload;
    },
    setTypeAutoReplies(state, action: PayloadAction<boolean | null>) {
      state.typeAutoReplies = action.payload;
    },
    setTypeTriggers(state, action: PayloadAction<boolean | null>) {
      state.typeTriggers = action.payload;
    },
    setTypeCommands(state, action: PayloadAction<boolean | null>) {
      state.typeCommands = action.payload;
    },
    setSearch(state, action: PayloadAction<string | null>) {
      state.search = action.payload;
    },
  },
});

export const {
  setSelectedFilter,
  setCurrentView,
  setSort,
  setSortDir,
  setStatusFilter,
  setBotIds,
  setChannelIds,
  setSystem,
  setTypeAutoReplies,
  setTypeTriggers,
  setTypeCommands,
  setSearch,
} = inboxSlice.actions;

export default inboxSlice.reducer;
