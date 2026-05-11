import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChannelsSelectionState {
  selectedIds: number[];
}

const initialState: ChannelsSelectionState = {
  selectedIds: [],
};

const slice = createSlice({
  name: 'channelsSelection',
  initialState,
  reducers: {
    toggleChannelId(state, action: PayloadAction<number>) {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx === -1) state.selectedIds.push(id);
      else state.selectedIds.splice(idx, 1);
    },
    setSelectedChannelIds(state, action: PayloadAction<number[]>) {
      state.selectedIds = [...action.payload];
    },
    clearSelectedChannels(state) {
      state.selectedIds = [];
    },
    reset() {
      return initialState;
    },
  },
});

export const {
  toggleChannelId,
  setSelectedChannelIds,
  clearSelectedChannels,
  reset: resetChannelsSelection,
} = slice.actions;

export default slice.reducer;
