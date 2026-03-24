import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CaptchaFailAction = 'KICK' | 'MUTE' | 'BAN';

interface JoinSettingsState {
  approvalMode: 'AUTO' | 'MANUAL' | 'CRITERIA';
  requiredChannels: number[];
  loaded: boolean;
  saving: boolean;
  error: string | null;
  captchaEnabled: boolean;
  captchaTimeoutSeconds: number;
  captchaFailAction: CaptchaFailAction;
  captchaFailDurationSeconds: number | null;
  captchaRestrictionType: string;
  captchaMessageBefore: string | null;
  captchaMessageFail: string | null;
  captchaMessageSuccess: string | null;
  captchaLoaded: boolean;
  captchaModalOpen: boolean;
}

const initialState: JoinSettingsState = {
  approvalMode: 'MANUAL',
  requiredChannels: [],
  loaded: false,
  saving: false,
  error: null,
  captchaEnabled: false,
  captchaTimeoutSeconds: 30,
  captchaFailAction: 'KICK',
  captchaFailDurationSeconds: null,
  captchaRestrictionType: 'send_messages',
  captchaMessageBefore: null,
  captchaMessageFail: null,
  captchaMessageSuccess: null,
  captchaLoaded: false,
  captchaModalOpen: false,
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
    setCaptchaData(state, action: PayloadAction<{
      captchaEnabled: boolean;
      captchaTimeoutSeconds: number;
      captchaFailAction: CaptchaFailAction;
      captchaFailDurationSeconds: number | null;
      captchaRestrictionType: string;
      captchaMessageBefore: string | null;
      captchaMessageFail: string | null;
      captchaMessageSuccess: string | null;
    }>) {
      Object.assign(state, action.payload);
    },
    setCaptchaEnabled(state, action: PayloadAction<boolean>) {
      state.captchaEnabled = action.payload;
    },
    setCaptchaTimeoutSeconds(state, action: PayloadAction<number>) {
      state.captchaTimeoutSeconds = action.payload;
    },
    setCaptchaFailAction(state, action: PayloadAction<CaptchaFailAction>) {
      state.captchaFailAction = action.payload;
    },
    setCaptchaFailDurationSeconds(state, action: PayloadAction<number | null>) {
      state.captchaFailDurationSeconds = action.payload;
    },
    setCaptchaRestrictionType(state, action: PayloadAction<string>) {
      state.captchaRestrictionType = action.payload;
    },
    setCaptchaMessages(state, action: PayloadAction<{
      captchaMessageBefore: string | null;
      captchaMessageFail: string | null;
      captchaMessageSuccess: string | null;
    }>) {
      state.captchaMessageBefore = action.payload.captchaMessageBefore;
      state.captchaMessageFail = action.payload.captchaMessageFail;
      state.captchaMessageSuccess = action.payload.captchaMessageSuccess;
    },
    setCaptchaLoaded(state, action: PayloadAction<boolean>) {
      state.captchaLoaded = action.payload;
    },
    setCaptchaModalOpen(state, action: PayloadAction<boolean>) {
      state.captchaModalOpen = action.payload;
    },
  },
});

export const {
  setApprovalData,
  setLoaded,
  setSaving,
  setError,
  setCaptchaData,
  setCaptchaEnabled,
  setCaptchaTimeoutSeconds,
  setCaptchaFailAction,
  setCaptchaFailDurationSeconds,
  setCaptchaRestrictionType,
  setCaptchaMessages,
  setCaptchaLoaded,
  setCaptchaModalOpen,
} = joinSettingsSlice.actions;

export default joinSettingsSlice.reducer;
