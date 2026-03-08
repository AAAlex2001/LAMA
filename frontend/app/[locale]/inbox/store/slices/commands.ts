import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BotCommand {
  id: number;
  bot_id: number;
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotCommandCreate {
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
}

interface CommandsState {
  commands: BotCommand[];
  loading: boolean;
  error: string | null;
}

const initialState: CommandsState = {
  commands: [],
  loading: false,
  error: null,
};

const commandsSlice = createSlice({
  name: 'commands',
  initialState,
  reducers: {
    setCommands(state, action: PayloadAction<BotCommand[]>) {
      state.commands = action.payload;
      state.error = null;
    },
    addCommand(state, action: PayloadAction<BotCommand>) {
      state.commands.push(action.payload);
    },
    updateCommand(state, action: PayloadAction<BotCommand>) {
      const index = state.commands.findIndex(cmd => cmd.id === action.payload.id);
      if (index !== -1) {
        state.commands[index] = action.payload;
      }
    },
    removeCommand(state, action: PayloadAction<number>) {
      state.commands = state.commands.filter(cmd => cmd.id !== action.payload);
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
  setCommands,
  addCommand,
  updateCommand,
  removeCommand,
  setLoading,
  setError,
  clearError,
  reset: resetCommands,
} = commandsSlice.actions;

export default commandsSlice.reducer;
