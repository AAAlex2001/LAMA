import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BotStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR';
export type ApprovalMode = 'AUTO' | 'MANUAL' | 'CRITERIA';
export type ApprovalDestination = 'INBOX' | 'TELEGRAM_BOT';

export interface Bot {
  id: number;
  telegram_id?: number;
  title?: string;
  first_name?: string;
  username: string;
  token?: string;
  status: BotStatus;
  welcome_enabled?: boolean;
  photo_url?: string | null;
  description?: string | null;
  short_description?: string | null;
  auto_approval_mode?: ApprovalMode;
  approval_destination?: ApprovalDestination;
  created_at?: string;
  updated_at?: string;
}

export interface BotCreate {
  token: string;
  description?: string;
}

export interface BotsState {
  bots: Bot[];
  currentBot: Bot | null;
  loading: boolean;
  toggling: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

const initialState: BotsState = {
  bots: [],
  currentBot: null,
  loading: false,
  toggling: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 50,
};

const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    setBots(state, action: PayloadAction<Bot[]>) {
      state.bots = action.payload;
      state.error = null;
    },
    setCurrentBot(state, action: PayloadAction<Bot | null>) {
      state.currentBot = action.payload;
    },
    clearCurrentBot(state) {
      state.currentBot = null;
    },
    addBot(state, action: PayloadAction<Bot>) {
      state.bots.push(action.payload);
      state.total += 1;
    },
    updateBot(state, action: PayloadAction<Bot>) {
      const idx = state.bots.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) state.bots[idx] = action.payload;
      if (state.currentBot?.id === action.payload.id) state.currentBot = action.payload;
    },
    removeBot(state, action: PayloadAction<number>) {
      state.bots = state.bots.filter((b) => b.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
      if (state.currentBot?.id === action.payload) state.currentBot = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setToggling(state, action: PayloadAction<boolean>) {
      state.toggling = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    setPagination(state, action: PayloadAction<{ page: number; pageSize: number; total: number }>) {
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
      state.total = action.payload.total;
    },
    resetBots() {
      return initialState;
    },
  },
});

export const {
  setBots,
  setCurrentBot,
  clearCurrentBot,
  addBot,
  updateBot,
  removeBot,
  setLoading,
  setToggling,
  setError,
  clearError,
  setPagination,
  resetBots,
} = botsSlice.actions;

export default botsSlice.reducer;
