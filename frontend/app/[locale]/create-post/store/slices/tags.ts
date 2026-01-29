import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tag, TagColor } from '../types';

interface TagsState {
  recentTags: Tag[];
  searchResults: Tag[];
  loading: boolean;
  searching: boolean;
  error: string | null;
  tagInputValue: string;
}

const initialState: TagsState = {
  recentTags: [],
  searchResults: [],
  loading: false,
  searching: false,
  error: null,
  tagInputValue: '',
};

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    setRecentTags(state, action: PayloadAction<Tag[]>) {
      state.recentTags = action.payload;
      state.error = null;
    },
    
    setSearchResults(state, action: PayloadAction<Tag[]>) {
      state.searchResults = action.payload;
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
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
  setSearchResults,
  setLoading,
  setSearching,
  setError,
  setTagInputValue,
  clearSearch,
  removeTag,
  reset: resetTags,
} = tagsSlice.actions;

export default tagsSlice.reducer;
