import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NightModeState {
  enabled: boolean;
  start: string;
  end: string;
  blockMedia: boolean;
  blockText: boolean;
  saving: boolean;
}

const initialState: NightModeState = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  blockMedia: false,
  blockText: false,
  saving: false,
};

const nightModeSlice = createSlice({
  name: 'nightMode',
  initialState,
  reducers: {
    initFromChannel(
      state,
      action: PayloadAction<{
        night_mode_enabled: boolean;
        night_mode_start: string | null;
        night_mode_end: string | null;
        night_mode_block_media: boolean;
        night_mode_block_text: boolean;
      }>,
    ) {
      const d = action.payload;
      state.enabled = d.night_mode_enabled;
      state.start = d.night_mode_start || '22:00';
      state.end = d.night_mode_end || '08:00';
      state.blockMedia = d.night_mode_block_media;
      state.blockText = d.night_mode_block_text;
    },
    setEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setStart(state, action: PayloadAction<string>) {
      state.start = action.payload;
    },
    setEnd(state, action: PayloadAction<string>) {
      state.end = action.payload;
    },
    setBlockMedia(state, action: PayloadAction<boolean>) {
      state.blockMedia = action.payload;
    },
    setBlockText(state, action: PayloadAction<boolean>) {
      state.blockText = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
  },
});

export const {
  initFromChannel,
  setEnabled,
  setStart,
  setEnd,
  setBlockMedia,
  setBlockText,
  setSaving,
} = nightModeSlice.actions;

export default nightModeSlice.reducer;
