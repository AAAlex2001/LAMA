import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InlineKeyboard } from '@/types/post';

export interface AutoReply {
  id: number;
  bot_id: number;
  keywords: string[];
  response_text: string;
  response_media_url?: string;
  response_media_urls?: string[];
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ListState {
  items: AutoReply[];
  loading: boolean;
  error: string | null;
  listModalOpen: boolean;
}

const initialState: ListState = {
  items: [],
  loading: false,
  error: null,
  listModalOpen: false,
};

const listSlice = createSlice({
  name: 'autoReplyList',
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<AutoReply[]>) {
      state.items = action.payload;
    },
    addItem(state, action: PayloadAction<AutoReply>) {
      state.items.unshift(action.payload);
    },
    updateItem(state, action: PayloadAction<AutoReply>) {
      const idx = state.items.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((r) => r.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setListModalOpen(state, action: PayloadAction<boolean>) {
      state.listModalOpen = action.payload;
    },
  },
});

export const {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  setListModalOpen,
} = listSlice.actions;

export default listSlice.reducer;
