import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BotStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | null;

export interface Bot {
  id: number;
  title?: string;
  username: string;
  token: string;
  status: BotStatus;
  created_at: string;
  updated_at: string;
}

export interface BotCreate {
  token: string;
}

interface BotsState {
  bots: Bot[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

const initialState: BotsState = {
  bots: [],
  loading: false,
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
    addBot(state, action: PayloadAction<Bot>) {
      state.bots.push(action.payload);
      state.total += 1;
    },
    updateBot(state, action: PayloadAction<Bot>) {
      const index = state.bots.findIndex(bot => bot.id === action.payload.id);
      if (index !== -1) {
        state.bots[index] = action.payload;
      }
    },
    removeBot(state, action: PayloadAction<number>) {
      state.bots = state.bots.filter(bot => bot.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
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
    setPagination(state, action: PayloadAction<{ page: number; pageSize: number; total: number }>) {
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
      state.total = action.payload.total;
    },
    reset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setBots,
  addBot,
  updateBot,
  removeBot,
  setLoading,
  setError,
  clearError,
  setPagination,
  reset: resetBots,
} = botsSlice.actions;

export default botsSlice.reducer;
