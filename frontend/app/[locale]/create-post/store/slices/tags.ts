import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tag, TagColor } from '../types';

interface TagsState {
  recentTags: Tag[];
  searchResults: Tag[];
  loading: boolean;
  loadingMore: boolean;
  searching: boolean;
  error: string | null;
  tagInputValue: string;
  page: number;
  hasMore: boolean;
  total: number;
}

const initialState: TagsState = {
  recentTags: [],
  searchResults: [],
  loading: false,
  loadingMore: false,
  searching: false,
  error: null,
  tagInputValue: '',
  page: 1,
  hasMore: true,
  total: 0,
};

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    setRecentTags(state, action: PayloadAction<Tag[]>) {
      state.recentTags = action.payload;
      state.error = null;
    },

    appendRecentTags(state, action: PayloadAction<Tag[]>) {
      const existingIds = new Set(state.recentTags.map(t => t.id));
      const newTags = action.payload.filter(t => !existingIds.has(t.id));
      state.recentTags = [...state.recentTags, ...newTags];
    },

    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },

    setHasMore(state, action: PayloadAction<boolean>) {
      state.hasMore = action.payload;
    },

    setTotal(state, action: PayloadAction<number>) {
      state.total = action.payload;
    },
    
    setSearchResults(state, action: PayloadAction<Tag[]>) {
      state.searchResults = action.payload;
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setLoadingMore(state, action: PayloadAction<boolean>) {
      state.loadingMore = action.payload;
    },
    
    setSearching(state, action: PayloadAction<boolean>) {
      state.searching = action.payload;
    },
    
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    setTagInputValue(state, action: PayloadAction<string>) {
      state.tagInputValue = action.payload;
    },
    
    clearSearch(state) {
      state.searchResults = [];
      state.tagInputValue = '';
    },
    
    removeTag(state, action: PayloadAction<number>) {
      state.recentTags = state.recentTags.filter(tag => tag.id !== action.payload);
      state.searchResults = state.searchResults.filter(tag => tag.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    },

    updateTagInList(state, action: PayloadAction<Tag>) {
      const updated = action.payload;
      state.recentTags = state.recentTags.map(t => t.id === updated.id ? updated : t);
      state.searchResults = state.searchResults.map(t => t.id === updated.id ? updated : t);
    },

    resetPagination(state) {
      state.page = 1;
      state.hasMore = true;
      state.recentTags = [];
      state.total = 0;
    },
    
    reset(state) {
      state.searchResults = [];
      state.tagInputValue = '';
      state.error = null;
    },
  },
});

export const {
  setRecentTags,
  appendRecentTags,
  setPage,
  setHasMore,
  setTotal,
  setSearchResults,
  setLoading,
  setLoadingMore,
  setSearching,
  setError,
  setTagInputValue,
  clearSearch,
  removeTag,
  updateTagInList,
  resetPagination,
  reset: resetTags,
} = tagsSlice.actions;

export default tagsSlice.reducer;
