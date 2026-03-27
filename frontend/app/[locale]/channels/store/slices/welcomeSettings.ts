import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type WelcomeMediaType = 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null;

interface WelcomeButton {
  text: string;
  url?: string;
}

export interface ForumTopic {
  thread_id: number;
  name: string;
  icon_color: number | null;
  icon_custom_emoji_id: string | null;
  is_closed: boolean;
}

interface WelcomeSettingsState {
  enabled: boolean;
  message: string | null;
  mediaUrl: string | null;
  mediaType: WelcomeMediaType;
  buttons: WelcomeButton[][] | null;
  messageThreadId: number | null;
  welcomeType: string;
  loaded: boolean;
  saving: boolean;
  modalOpen: boolean;
  topics: ForumTopic[];
  topicsLoaded: boolean;
}

const initialState: WelcomeSettingsState = {
  enabled: false,
  message: null,
  mediaUrl: null,
  mediaType: null,
  buttons: null,
  messageThreadId: null,
  welcomeType: 'group_message',
  loaded: false,
  saving: false,
  modalOpen: false,
  topics: [],
  topicsLoaded: false,
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
      welcomeType: string;
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
    setTopics(state, action: PayloadAction<ForumTopic[]>) {
      state.topics = action.payload;
      state.topicsLoaded = true;
    },
  },
});

export const {
  setWelcomeData,
  setEnabled,
  setModalOpen,
  setSaving,
  clearMessage,
  setTopics,
} = welcomeSettingsSlice.actions;

export default welcomeSettingsSlice.reducer;
