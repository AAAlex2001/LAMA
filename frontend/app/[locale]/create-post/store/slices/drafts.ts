import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from '../types';

interface DraftsState {
  items: Draft[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  tagIdsFilter: number[];
  selectedDraftId: number | null;
  page: number;
  sortOrder: 'asc' | 'desc';
}

const initialState: DraftsState = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  searchQuery: '',
  tagIdsFilter: [],
  selectedDraftId: null,
  page: 1,
  sortOrder: 'desc',
};

const draftsSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    setDrafts: (state, action: PayloadAction<Draft[]>) => {
      state.items = action.payload;
    },
    appendDrafts: (state, action: PayloadAction<Draft[]>) => {
      const existingIds = new Set(state.items.map(d => d.id));
      const newItems = action.payload.filter(d => !existingIds.has(d.id));
      state.items = [...state.items, ...newItems];
    },
    removeDraft: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((d) => d.id !== action.payload);
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setTagIdsFilter: (state, action: PayloadAction<number[]>) => {
      state.tagIdsFilter = action.payload;
    },
    setSelectedDraftId: (state, action: PayloadAction<number | null>) => {
      state.selectedDraftId = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    resetDrafts: () => initialState,
  },
});

export const {
  setDrafts,
  appendDrafts,
  removeDraft,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setSearchQuery,
  setTagIdsFilter,
  setSelectedDraftId,
  setPage,
  setSortOrder,
  resetDrafts,
} = draftsSlice.actions;

export default draftsSlice.reducer;
