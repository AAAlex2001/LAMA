import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SavingType = 'draft' | 'publish' | 'schedule' | null;

export interface InfoMessage {
  id: number;
  channel_id: number;
  text: string;
  media_url: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  inline_keyboard: any[][] | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AutomationState {
  enabled: boolean;
  autoReplyEnabled: boolean;
  messages: InfoMessage[];
  editingMessage: InfoMessage | null;
  loading: boolean;
  saving: boolean;
  savingType: SavingType;
}

const initialState: AutomationState = {
  enabled: false,
  autoReplyEnabled: true,
  messages: [],
  editingMessage: null,
  loading: false,
  saving: false,
  savingType: null,
};

const automationSlice = createSlice({
  name: 'automation',
  initialState,
  reducers: {
    setInfoMessagesEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setAutoReplyEnabled(state, action: PayloadAction<boolean>) {
      state.autoReplyEnabled = action.payload;
    },
    setMessages(state, action: PayloadAction<InfoMessage[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<InfoMessage>) {
      state.messages.push(action.payload);
    },
    updateMessage(state, action: PayloadAction<InfoMessage>) {
      const idx = state.messages.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.messages[idx] = action.payload;
    },
    removeMessage(state, action: PayloadAction<number>) {
      state.messages = state.messages.filter((m) => m.id !== action.payload);
    },
    setEditingMessage(state, action: PayloadAction<InfoMessage | null>) {
      state.editingMessage = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setSavingType(state, action: PayloadAction<SavingType>) {
      state.savingType = action.payload;
    },
  },
});

export const {
  setInfoMessagesEnabled,
  setAutoReplyEnabled,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  setEditingMessage,
  setLoading,
  setSaving,
  setSavingType,
} = automationSlice.actions;

export default automationSlice.reducer;
