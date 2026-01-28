import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TextTemplate } from '../types';

interface TemplatesState {
  items: TextTemplate[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedTemplateId: number | null;
  page: number;
}

const initialState: TemplatesState = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  searchQuery: '',
  selectedTemplateId: null,
  page: 1,
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplates: (state, action: PayloadAction<TextTemplate[]>) => {
      state.items = action.payload;
    },
    appendTemplates: (state, action: PayloadAction<TextTemplate[]>) => {
      const existingIds = new Set(state.items.map(t => t.id));
      const newItems = action.payload.filter(t => !existingIds.has(t.id));
      state.items = [...state.items, ...newItems];
    },
    updateTemplate: (state, action: PayloadAction<{ id: number; changes: Partial<TextTemplate> }>) => {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...action.payload.changes };
      }
    },
    removeTemplate: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
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
    setSelectedTemplateId: (state, action: PayloadAction<number | null>) => {
      state.selectedTemplateId = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    resetTemplates: () => initialState,
  },
});

export const {
  setTemplates,
  appendTemplates,
  updateTemplate,
  removeTemplate,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setSearchQuery,
  setSelectedTemplateId,
  setPage,
  resetTemplates,
} = templatesSlice.actions;

export default templatesSlice.reducer;
