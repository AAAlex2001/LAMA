import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CreateCommandModalState {
  isOpen: boolean;
  command: string;
  description: string;
  response_text: string;
  response_media_url: string;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  scope: 'PRIVATE' | 'PUBLIC';
  is_active: boolean;
  botSearch: string;
  selectedBotIds: string[];
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
  botSearch: '',
  selectedBotIds: [],
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
    setResponseMediaType(state, action: PayloadAction<'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT'>) {
      state.response_media_type = action.payload;
    },
    setScope(state, action: PayloadAction<'PRIVATE' | 'PUBLIC'>) {
      state.scope = action.payload;
    },
    setIsActive(state, action: PayloadAction<boolean>) {
      state.is_active = action.payload;
    },
    setBotSearch(state, action: PayloadAction<string>) {
      state.botSearch = action.payload;
    },
    toggleSelectedBotId(state, action: PayloadAction<string>) {
      const botId = action.payload;
      const index = state.selectedBotIds.indexOf(botId);
      if (index === -1) {
        state.selectedBotIds.push(botId);
      } else {
        state.selectedBotIds.splice(index, 1);
      }
    },
    setSelectedBotIds(state, action: PayloadAction<string[]>) {
      state.selectedBotIds = action.payload;
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
  setBotSearch,
  toggleSelectedBotId,
  setSelectedBotIds,
  resetForm,
} = createCommandModalSlice.actions;

export default createCommandModalSlice.reducer;
