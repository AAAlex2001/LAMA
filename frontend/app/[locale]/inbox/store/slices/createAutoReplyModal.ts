import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CreateAutoReplyModalState {
  isOpen: boolean;
  keywords: string[];
  response_text: string;
  response_media_url: string;
  response_media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  scope: 'PRIVATE' | 'PUBLIC';
  is_active: boolean;
}

const initialState: CreateAutoReplyModalState = {
  isOpen: false,
  keywords: [''],
  response_text: '',
  response_media_url: '',
  response_media_type: 'TEXT',
  scope: 'PRIVATE',
  is_active: true,
};

const createAutoReplyModalSlice = createSlice({
  name: 'createAutoReplyModal',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
      if (!action.payload) {
        Object.assign(state, initialState);
      }
    },
    setKeywords(state, action: PayloadAction<string[]>) {
      state.keywords = action.payload;
    },
    setKeyword(state, action: PayloadAction<{ index: number; value: string }>) {
      state.keywords[action.payload.index] = action.payload.value;
    },
    addKeyword(state) {
      state.keywords.push('');
    },
    removeKeyword(state, action: PayloadAction<number>) {
      if (state.keywords.length > 1) {
        state.keywords = state.keywords.filter((_, i) => i !== action.payload);
      }
    },
    setResponseText(state, action: PayloadAction<string>) {
      state.response_text = action.payload;
    },
    setResponseMediaUrl(state, action: PayloadAction<string>) {
      state.response_media_url = action.payload;
    },
    setResponseMediaType(state, action: PayloadAction<'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>) {
      state.response_media_type = action.payload;
    },
    setScope(state, action: PayloadAction<'PRIVATE' | 'PUBLIC'>) {
      state.scope = action.payload;
    },
    setIsActive(state, action: PayloadAction<boolean>) {
      state.is_active = action.payload;
    },
    resetForm(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setModalOpen,
  setKeywords,
  setKeyword,
  addKeyword,
  removeKeyword,
  setResponseText,
  setResponseMediaUrl,
  setResponseMediaType,
  setScope,
  setIsActive,
  resetForm,
} = createAutoReplyModalSlice.actions;

export default createAutoReplyModalSlice.reducer;
