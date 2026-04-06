import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from '@/types/post';

export interface DraftListState {
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

const initialState: DraftListState = {
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

const draftListSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    setDrafts: (state, action: PayloadAction<Draft[]>) => {
      state.items = action.payload;
    },
    appendDrafts: (state, action: PayloadAction<Draft[]>) => {
      const existingIds = new Set(state.items.map((d) => d.id));
      const newItems = action.payload.filter((d) => !existingIds.has(d.id));

      for (const item of newItems) {
        if (!item.series_id) {
          state.items.push(item);
          continue;
        }
        const idx = state.items.findIndex((d) => d.series_id === item.series_id);
        if (idx === -1) {
          state.items.push(item);
        } else {
          const existing = state.items[idx];
          const add = item.series_count ?? 1;
          const base = existing.series_count ?? 1;
          state.items[idx] = {
            ...existing,
            series_count: base + add,
          };
        }
      }
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
} = draftListSlice.actions;

export default draftListSlice.reducer;
