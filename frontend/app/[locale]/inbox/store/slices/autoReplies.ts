import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AutoReply {
  id: number;
  bot_id: number;
  keywords: string[];
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoReplyCreate {
  keywords: string[];
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
}

interface AutoRepliesState {
  autoReplies: AutoReply[];
  loading: boolean;
  error: string | null;
}

const initialState: AutoRepliesState = {
  autoReplies: [],
  loading: false,
  error: null,
};

const autoRepliesSlice = createSlice({
  name: 'autoReplies',
  initialState,
  reducers: {
    setAutoReplies(state, action: PayloadAction<AutoReply[]>) {
      state.autoReplies = action.payload;
      state.error = null;
    },
    addAutoReply(state, action: PayloadAction<AutoReply>) {
      state.autoReplies.push(action.payload);
    },
    updateAutoReply(state, action: PayloadAction<AutoReply>) {
      const index = state.autoReplies.findIndex(ar => ar.id === action.payload.id);
      if (index !== -1) {
        state.autoReplies[index] = action.payload;
      }
    },
    removeAutoReply(state, action: PayloadAction<number>) {
      state.autoReplies = state.autoReplies.filter(ar => ar.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    reset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setAutoReplies,
  addAutoReply,
  updateAutoReply,
  removeAutoReply,
  setLoading,
  setError,
  clearError,
  reset: resetAutoReplies,
} = autoRepliesSlice.actions;

export default autoRepliesSlice.reducer;
