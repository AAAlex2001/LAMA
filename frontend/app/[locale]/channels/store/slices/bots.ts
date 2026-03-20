import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BotData {
  id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}

interface BotsState {
  bot: BotData | null;
  loading: boolean;
  toggling: boolean;
  error: string | null;
}

const initialState: BotsState = {
  bot: null,
  loading: false,
  toggling: false,
  error: null,
};

const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    setBot(state, action: PayloadAction<BotData | null>) {
      state.bot = action.payload;
    },
    clearBot(state) {
      state.bot = null;
    },
    setBotLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setBotToggling(state, action: PayloadAction<boolean>) {
      state.toggling = action.payload;
    },
    setBotError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setBot, clearBot, setBotLoading, setBotToggling, setBotError } = botsSlice.actions;

export default botsSlice.reducer;
