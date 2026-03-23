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

  bannedWordsEnabled: boolean;

  mediaBlockEnabled: boolean;
  mediaBlockTypes: string[];

  autoDeleteEnabled: boolean;
  autoDeleteSystemMessages: boolean;
  autoDeleteCommandMessages: boolean;

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

  bannedWordsEnabled: false,

  mediaBlockEnabled: false,
  mediaBlockTypes: [],

  autoDeleteEnabled: false,
  autoDeleteSystemMessages: false,
  autoDeleteCommandMessages: false,

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
      commandsEnabled: boolean;
      enabledCommands: string[] | null;
      blockMediaTypes: string[] | null;
    }>) {
      state.nightModeEnabled = action.payload.nightModeEnabled;
      state.commandsEnabled = action.payload.commandsEnabled;
      if (action.payload.enabledCommands !== null) {
        state.selectedCommands = action.payload.enabledCommands;
      }
      const types = action.payload.blockMediaTypes ?? [];
      state.mediaBlockTypes = types;
      state.mediaBlockEnabled = types.length > 0;
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
    setBannedWordsEnabled(state, action: PayloadAction<boolean>) {
      state.bannedWordsEnabled = action.payload;
    },
    setMediaBlockEnabled(state, action: PayloadAction<boolean>) {
      state.mediaBlockEnabled = action.payload;
      if (!action.payload) {
        state.mediaBlockTypes = [];
      } else if (state.mediaBlockTypes.length === 0) {
        state.mediaBlockTypes = ['photo', 'video', 'gif', 'files', 'voice'];
      }
    },
    setMediaBlockTypes(state, action: PayloadAction<string[]>) {
      state.mediaBlockTypes = action.payload;
      state.mediaBlockEnabled = action.payload.length > 0;
    },
    toggleMediaType(state, action: PayloadAction<string>) {
      const type = action.payload;
      const idx = state.mediaBlockTypes.indexOf(type);
      if (idx >= 0) {
        state.mediaBlockTypes.splice(idx, 1);
      } else {
        state.mediaBlockTypes.push(type);
      }
      state.mediaBlockEnabled = state.mediaBlockTypes.length > 0;
    },
    setAutoDeleteEnabled(state, action: PayloadAction<boolean>) {
      state.autoDeleteEnabled = action.payload;
    },
    setAutoDeleteSystemMessages(state, action: PayloadAction<boolean>) {
      state.autoDeleteSystemMessages = action.payload;
      state.autoDeleteEnabled = action.payload || state.autoDeleteCommandMessages;
    },
    setAutoDeleteCommandMessages(state, action: PayloadAction<boolean>) {
      state.autoDeleteCommandMessages = action.payload;
      state.autoDeleteEnabled = state.autoDeleteSystemMessages || action.payload;
    },
    initAutoDeleteSettings(state, action: PayloadAction<{
      delete_system_messages: boolean;
      delete_command_messages: boolean;
    }>) {
      state.autoDeleteSystemMessages = action.payload.delete_system_messages;
      state.autoDeleteCommandMessages = action.payload.delete_command_messages;
      state.autoDeleteEnabled = action.payload.delete_system_messages || action.payload.delete_command_messages;
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
  setBannedWordsEnabled,
  setMediaBlockEnabled,
  setMediaBlockTypes,
  toggleMediaType,
  setAutoDeleteEnabled,
  setAutoDeleteSystemMessages,
  setAutoDeleteCommandMessages,
  initAutoDeleteSettings,
  setNightModeEnabled,
  setSaving,
  setError,
} = moderationSlice.actions;

export default moderationSlice.reducer;
