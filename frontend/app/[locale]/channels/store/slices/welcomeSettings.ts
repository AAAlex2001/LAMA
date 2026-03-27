import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type WelcomeMediaType = 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null;

interface WelcomeButton {
  text: string;
  url?: string;
}

interface WelcomeSettingsState {
  enabled: boolean;
  message: string | null;
  mediaUrl: string | null;
  mediaType: WelcomeMediaType;
  buttons: WelcomeButton[][] | null;
  messageThreadId: number | null;
  loaded: boolean;
  saving: boolean;
  modalOpen: boolean;
}

const initialState: WelcomeSettingsState = {
  enabled: false,
  message: null,
  mediaUrl: null,
  mediaType: null,
  buttons: null,
  messageThreadId: null,
  loaded: false,
  saving: false,
  modalOpen: false,
};

const welcomeSettingsSlice = createSlice({
  name: 'welcomeSettings',
  initialState,
  reducers: {
    setWelcomeData(state, action: PayloadAction<{
      enabled: boolean;
      message: string | null;
      mediaUrl: string | null;
      mediaType: WelcomeMediaType;
      buttons: WelcomeButton[][] | null;
      messageThreadId: number | null;
    }>) {
      Object.assign(state, action.payload);
      state.loaded = true;
    },
    setEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.modalOpen = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    clearMessage(state) {
      state.message = null;
      state.mediaUrl = null;
      state.mediaType = null;
      state.buttons = null;
    },
  },
});

export const {
  setWelcomeData,
  setEnabled,
  setModalOpen,
  setSaving,
  clearMessage,
} = welcomeSettingsSlice.actions;

export default welcomeSettingsSlice.reducer;
