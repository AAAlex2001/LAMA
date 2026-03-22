import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BannedWordRule {
  id: number;
  phrase: string;
  action: string;
  mute_duration_minutes: number | null;
}

interface BannedWordsState {
  enabled: boolean;
  rules: BannedWordRule[];
  inputValue: string;
  muteDays: number;
  muteHours: number;
  muteMinutes: number;
  saving: boolean;
  error: string | null;
}

const initialState: BannedWordsState = {
  enabled: false,
  rules: [],
  inputValue: '',
  muteDays: 0,
  muteHours: 1,
  muteMinutes: 1,
  saving: false,
  error: null,
};

const bannedWordsSlice = createSlice({
  name: 'bannedWords',
  initialState,
  reducers: {
    setEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setRules(state, action: PayloadAction<BannedWordRule[]>) {
      state.rules = action.payload;
    },
    addRule(state, action: PayloadAction<BannedWordRule>) {
      state.rules.push(action.payload);
    },
    removeRule(state, action: PayloadAction<number>) {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
    },
    setInputValue(state, action: PayloadAction<string>) {
      state.inputValue = action.payload;
    },
    setMuteDays(state, action: PayloadAction<number>) {
      state.muteDays = action.payload;
    },
    setMuteHours(state, action: PayloadAction<number>) {
      state.muteHours = action.payload;
    },
    setMuteMinutes(state, action: PayloadAction<number>) {
      state.muteMinutes = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setEnabled,
  setRules,
  addRule,
  removeRule,
  setInputValue,
  setMuteDays,
  setMuteHours,
  setMuteMinutes,
  setSaving,
  setError,
} = bannedWordsSlice.actions;

export default bannedWordsSlice.reducer;
