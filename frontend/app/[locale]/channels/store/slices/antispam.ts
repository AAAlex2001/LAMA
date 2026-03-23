import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type LinkFilterMode = 'DISABLED' | 'BLOCK_ALL' | 'ALLOW_TME_ONLY' | 'WHITELIST' | 'BLACKLIST';
type FilterAction = 'DELETE' | 'MUTE' | 'KICK';

interface AntispamState {
  mode: LinkFilterMode;
  whitelist: string[];
  blacklist: string[];
  action: FilterAction;
  muteDays: number;
  muteHours: number;
  muteMinutes: number;
  urlInput: string;
  saving: boolean;
  loaded: boolean;
}

const initialState: AntispamState = {
  mode: 'DISABLED',
  whitelist: [],
  blacklist: [],
  action: 'DELETE',
  muteDays: 0,
  muteHours: 1,
  muteMinutes: 0,
  urlInput: '',
  saving: false,
  loaded: false,
};

const antispamSlice = createSlice({
  name: 'antispam',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<LinkFilterMode>) {
      state.mode = action.payload;
    },
    setWhitelist(state, action: PayloadAction<string[]>) {
      state.whitelist = action.payload;
    },
    setBlacklist(state, action: PayloadAction<string[]>) {
      state.blacklist = action.payload;
    },
    setAction(state, action: PayloadAction<FilterAction>) {
      state.action = action.payload;
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
    setUrlInput(state, action: PayloadAction<string>) {
      state.urlInput = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setLoaded(state, action: PayloadAction<boolean>) {
      state.loaded = action.payload;
    },
    initFromResponse(
      state,
      action: PayloadAction<{
        link_filter_mode: LinkFilterMode;
        link_whitelist: string[] | null;
        link_blacklist: string[] | null;
        link_filter_action: FilterAction;
        link_filter_mute_duration: number | null;
      }>,
    ) {
      const d = action.payload;
      state.mode = d.link_filter_mode;
      state.whitelist = d.link_whitelist ?? [];
      state.blacklist = d.link_blacklist ?? [];
      state.action = d.link_filter_action;
      const total = d.link_filter_mute_duration ?? 0;
      state.muteDays = Math.floor(total / 1440);
      state.muteHours = Math.floor((total % 1440) / 60);
      state.muteMinutes = total % 60;
      state.loaded = true;
    },
  },
});

export const {
  setMode,
  setWhitelist,
  setBlacklist,
  setAction,
  setMuteDays,
  setMuteHours,
  setMuteMinutes,
  setUrlInput,
  setSaving,
  setLoaded,
  initFromResponse,
} = antispamSlice.actions;

export default antispamSlice.reducer;
