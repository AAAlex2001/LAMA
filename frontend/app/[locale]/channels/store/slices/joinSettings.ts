import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface JoinSettingsState {
  approvalMode: 'AUTO' | 'MANUAL' | 'CRITERIA';
  requiredChannels: number[];
  loaded: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: JoinSettingsState = {
  approvalMode: 'MANUAL',
  requiredChannels: [],
  loaded: false,
  saving: false,
  error: null,
};

const joinSettingsSlice = createSlice({
  name: 'joinSettings',
  initialState,
  reducers: {
    setApprovalData(state, action: PayloadAction<{
      approvalMode: 'AUTO' | 'MANUAL' | 'CRITERIA';
      requiredChannels: number[];
    }>) {
      state.approvalMode = action.payload.approvalMode;
      state.requiredChannels = action.payload.requiredChannels;
    },
    setLoaded(state, action: PayloadAction<boolean>) {
      state.loaded = action.payload;
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
  setApprovalData,
  setLoaded,
  setSaving,
  setError,
} = joinSettingsSlice.actions;

export default joinSettingsSlice.reducer;
