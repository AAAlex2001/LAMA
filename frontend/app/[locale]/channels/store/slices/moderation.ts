import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FloodSettings {
  flood_message_limit: number | null;
  flood_interval_seconds: number | null;
  flood_action: string | null;
  flood_mute_duration_minutes: number | null;
}

interface ModerationState {
  commandsEnabled: boolean;
  selectedCommands: string[];

  floodEnabled: boolean;
  floodSettings: FloodSettings;
  muteDays: number;
  muteHours: number;
  muteMinutes: number;

  antispamEnabled: boolean;
  bannedWordsEnabled: boolean;
  mediaBlockEnabled: boolean;
  autoDeleteEnabled: boolean;
  nightModeEnabled: boolean;

  saving: boolean;
  error: string | null;
}

const ALL_COMMANDS = ['admin', 'ban', 'unban', 'mute', 'unmute', 'kick'];

const initialState: ModerationState = {
  commandsEnabled: false,
  selectedCommands: [...ALL_COMMANDS],

  floodEnabled: false,
  floodSettings: {
    flood_message_limit: 5,
    flood_interval_seconds: 10,
    flood_action: 'MUTE',
    flood_mute_duration_minutes: 61,
  },
  muteDays: 0,
  muteHours: 1,
  muteMinutes: 1,

  antispamEnabled: false,
  bannedWordsEnabled: false,
  mediaBlockEnabled: false,
  autoDeleteEnabled: false,
  nightModeEnabled: false,

  saving: false,
  error: null,
};

const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    initFromChannel(state, action: PayloadAction<{
      nightModeEnabled: boolean;
    }>) {
      state.nightModeEnabled = action.payload.nightModeEnabled;
    },
    setCommandsEnabled(state, action: PayloadAction<boolean>) {
      state.commandsEnabled = action.payload;
    },
    toggleCommand(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedCommands.indexOf(id);
      if (idx >= 0) {
        state.selectedCommands.splice(idx, 1);
      } else {
        state.selectedCommands.push(id);
      }
    },
    setFloodEnabled(state, action: PayloadAction<boolean>) {
      state.floodEnabled = action.payload;
    },
    setFloodSettings(state, action: PayloadAction<FloodSettings>) {
      state.floodSettings = action.payload;
      if (action.payload.flood_mute_duration_minutes) {
        const total = action.payload.flood_mute_duration_minutes;
        state.muteDays = Math.floor(total / 1440);
        state.muteHours = Math.floor((total % 1440) / 60);
        state.muteMinutes = total % 60;
      }
    },
    setFloodMessageLimit(state, action: PayloadAction<number>) {
      state.floodSettings.flood_message_limit = action.payload;
    },
    setFloodIntervalSeconds(state, action: PayloadAction<number>) {
      state.floodSettings.flood_interval_seconds = action.payload;
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
    setAntispamEnabled(state, action: PayloadAction<boolean>) {
      state.antispamEnabled = action.payload;
    },
    setBannedWordsEnabled(state, action: PayloadAction<boolean>) {
      state.bannedWordsEnabled = action.payload;
    },
    setMediaBlockEnabled(state, action: PayloadAction<boolean>) {
      state.mediaBlockEnabled = action.payload;
    },
    setAutoDeleteEnabled(state, action: PayloadAction<boolean>) {
      state.autoDeleteEnabled = action.payload;
    },
    setNightModeEnabled(state, action: PayloadAction<boolean>) {
      state.nightModeEnabled = action.payload;
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
  initFromChannel,
  setCommandsEnabled,
  toggleCommand,
  setFloodEnabled,
  setFloodSettings,
  setFloodMessageLimit,
  setFloodIntervalSeconds,
  setMuteDays,
  setMuteHours,
  setMuteMinutes,
  setAntispamEnabled,
  setBannedWordsEnabled,
  setMediaBlockEnabled,
  setAutoDeleteEnabled,
  setNightModeEnabled,
  setSaving,
  setError,
} = moderationSlice.actions;

export default moderationSlice.reducer;
