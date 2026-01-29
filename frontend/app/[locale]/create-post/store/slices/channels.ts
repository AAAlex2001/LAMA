import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Channel } from '../types';

interface ChannelsState {
  channels: Channel[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  total: number;
}

const initialState: ChannelsState = {
  channels: [],
  loading: false,
  syncing: false,
  error: null,
  total: 0,
};

const channelsSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    setChannels(state, action: PayloadAction<Channel[]>) {
      state.channels = action.payload;
      state.error = null;
    },
    
    addChannel(state, action: PayloadAction<Channel>) {
      state.channels.push(action.payload);
      state.total += 1;
    },
    
    updateChannel(state, action: PayloadAction<Channel>) {
      const index = state.channels.findIndex(ch => ch.id === action.payload.id);
      if (index !== -1) {
        state.channels[index] = action.payload;
      }
    },
    
    removeChannel(state, action: PayloadAction<number>) {
      state.channels = state.channels.filter(ch => ch.id !== action.payload);
      state.total -= 1;
    },
    
    toggleChannelSelected(state, action: PayloadAction<number>) {
      const channel = state.channels.find(ch => ch.id === action.payload);
      if (channel) {
        channel.selected = !channel.selected;
      }
    },
    
    selectAllChannels(state) {
      state.channels.forEach(ch => {
        ch.selected = true;
      });
    },
    
    deselectAllChannels(state) {
      state.channels.forEach(ch => {
        ch.selected = false;
      });
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    
    setSyncing(state, action: PayloadAction<boolean>) {
      state.syncing = action.payload;
    },
    
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    setTotal(state, action: PayloadAction<number>) {
      state.total = action.payload;
    },
    
    clearError(state) {
      state.error = null;
    },
    
    reset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setChannels,
  addChannel,
  updateChannel,
  removeChannel,
  toggleChannelSelected,
  selectAllChannels,
  deselectAllChannels,
  setLoading,
  setSyncing,
  setError,
  setTotal,
  clearError,
  reset: resetChannels,
} = channelsSlice.actions;

export default channelsSlice.reducer;
