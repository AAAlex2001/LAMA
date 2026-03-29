import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InlineKeyboard } from '@/types/post';

export type BotCommandScope = 'PRIVATE' | 'GROUPS' | 'ALL' | null;

export interface BotCommand {
  id: number;
  bot_id: number;
  channel_id?: number | null;
  command: string;
  description?: string | null;
  response_text: string;
  action_type?: 'MESSAGE' | 'CLAIM_ADMIN';
  claim_target?: 'ADMINS' | 'INBOX' | 'SPECIFIC_CHANNEL' | null;
  claim_channel_ids?: number[] | null;
  response_media_url?: string | null;
  response_media_urls?: string[] | null;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard | null;
  scope: BotCommandScope;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ListState {
  items: BotCommand[];
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
  name: 'botCommandList',
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<BotCommand[]>) {
      state.items = action.payload;
    },
    addItem(state, action: PayloadAction<BotCommand>) {
      state.items.unshift(action.payload);
    },
    updateItem(state, action: PayloadAction<BotCommand>) {
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

export const { setItems, addItem, updateItem, removeItem, setLoading, setError, setListModalOpen } = listSlice.actions;

export default listSlice.reducer;
