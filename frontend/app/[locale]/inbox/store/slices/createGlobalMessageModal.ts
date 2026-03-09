import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CreateGlobalMessageModalState {
  isOpen: boolean;
  text_content: string;
  media_url: string;
  media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  botSearch: string;
  selectedBotIds: string[];
  isLoading: boolean;
}

const initialState: CreateGlobalMessageModalState = {
  isOpen: false,
  text_content: '',
  media_url: '',
  media_type: 'TEXT',
  botSearch: '',
  selectedBotIds: [],
  isLoading: false,
};

const createGlobalMessageModalSlice = createSlice({
  name: 'createGlobalMessageModal',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
      if (!action.payload) {
        Object.assign(state, initialState);
      }
    },
    setTextContent(state, action: PayloadAction<string>) {
      state.text_content = action.payload;
    },
    setMediaUrl(state, action: PayloadAction<string>) {
      state.media_url = action.payload;
    },
    setMediaType(state, action: PayloadAction<'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT'>) {
      state.media_type = action.payload;
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
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setModalOpen,
  setTextContent,
  setMediaUrl,
  setMediaType,
  setBotSearch,
  toggleSelectedBotId,
  setSelectedBotIds,
  resetForm,
  setIsLoading,
} = createGlobalMessageModalSlice.actions;

export default createGlobalMessageModalSlice.reducer;
