import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CreateCommandModalState {
  isOpen: boolean;
  command: string;
  description: string;
  response_text: string;
  response_media_url: string;
  response_media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  scope: 'PRIVATE' | 'PUBLIC';
  is_active: boolean;
}

const initialState: CreateCommandModalState = {
  isOpen: false,
  command: '',
  description: '',
  response_text: '',
  response_media_url: '',
  response_media_type: 'TEXT',
  scope: 'PRIVATE',
  is_active: true,
};

const createCommandModalSlice = createSlice({
  name: 'createCommandModal',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
      if (!action.payload) {
        Object.assign(state, initialState);
      }
    },
    setCommand(state, action: PayloadAction<string>) {
      state.command = action.payload;
    },
    setDescription(state, action: PayloadAction<string>) {
      state.description = action.payload;
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
  setCommand,
  setDescription,
  setResponseText,
  setResponseMediaUrl,
  setResponseMediaType,
  setScope,
  setIsActive,
  resetForm,
} = createCommandModalSlice.actions;

export default createCommandModalSlice.reducer;
