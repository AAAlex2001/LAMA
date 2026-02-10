import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  ChannelOption,
  Tag,
  TagColor,
  RepeatOption,
  RepeatCustomUnit,
  AutoDeleteOption,
} from '../types';

interface SettingsState {
  channels: ChannelOption[];
  channelsLoading: boolean;
  showCreateChannel: boolean;
  
  notifySubscribers: boolean;
  pinPost: boolean;
  
  recentTags: Tag[];
  tagsLoading: boolean;
  searchResults: Tag[];
  searching: boolean;
  tagInputValue: string;
  selectedTags: Array<{ id?: number; name: string; color: TagColor }>;
  selectedTagColor: TagColor;
  
  repeatInterval: RepeatOption;
  repeatPublishTimeType: 'from_publish' | 'exact_time';
  repeatPublishHours: number;
  repeatPublishMinutes: number;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
  repeatEndType: 'never' | 'date';
  repeatEndDate: string | null;
  
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  
  replyToPostId: number | null;
}

const initialState: SettingsState = {
  channels: [],
  channelsLoading: false,
  showCreateChannel: false,
  
  notifySubscribers: true,
  pinPost: false,
  
  recentTags: [],
  tagsLoading: false,
  searchResults: [],
  searching: false,
  tagInputValue: '',
  selectedTags: [],
  selectedTagColor: '#FAC7C7',
  
  repeatInterval: 'never',
  repeatPublishTimeType: 'from_publish',
  repeatPublishHours: 12,
  repeatPublishMinutes: 0,
  repeatCustomDays: 0,
  repeatCustomHours: 0,
  repeatCustomUnit: 'days',
  repeatCustomValue: 1,
  repeatWeekdays: [],
  repeatMonthDays: [1],
  repeatYearMonth: 0,
  repeatYearDays: [1],
  repeatEndType: 'never',
  repeatEndDate: null,
  
  autoDeleteInterval: 'never',
  autoDeleteCustomDays: 0,
  autoDeleteCustomHours: 0,
  
  replyToPostId: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setChannels(state, action: PayloadAction<ChannelOption[]>) {
      state.channels = action.payload;
    },
    setChannelsLoading(state, action: PayloadAction<boolean>) {
      state.channelsLoading = action.payload;
    },
    toggleChannel(state, action: PayloadAction<string>) {
      const channel = state.channels.find(c => c.id === action.payload);
      if (channel) {
        channel.checked = !channel.checked;
      }
    },
    setShowCreateChannel(state, action: PayloadAction<boolean>) {
      state.showCreateChannel = action.payload;
    },
    
    setNotifySubscribers(state, action: PayloadAction<boolean>) {
      state.notifySubscribers = action.payload;
    },
    setPinPost(state, action: PayloadAction<boolean>) {
      state.pinPost = action.payload;
    },
    
    setRecentTags(state, action: PayloadAction<Tag[]>) {
      state.recentTags = action.payload;
    },
    setTagsLoading(state, action: PayloadAction<boolean>) {
      state.tagsLoading = action.payload;
    },
    setSearchResults(state, action: PayloadAction<Tag[]>) {
      state.searchResults = action.payload;
    },
    setSearching(state, action: PayloadAction<boolean>) {
      state.searching = action.payload;
    },
    setTagInputValue(state, action: PayloadAction<string>) {
      state.tagInputValue = action.payload;
    },
    setSelectedTagColor(state, action: PayloadAction<TagColor>) {
      state.selectedTagColor = action.payload;
    },
    addTag(state, action: PayloadAction<{ id?: number; name: string; color: TagColor }>) {
      const exists = state.selectedTags.some(t => t.name === action.payload.name);
      if (!exists && action.payload.name.trim()) {
        state.selectedTags.push(action.payload);
      }
      state.tagInputValue = '';
      state.searchResults = [];
    },
    updateSelectedTagId(state, action: PayloadAction<{ name: string; id: number }>) {
      const tag = state.selectedTags.find(t => t.name === action.payload.name);
      if (tag) {
        tag.id = action.payload.id;
      }
    },
    updateSelectedTag(state, action: PayloadAction<{ id: number; name: string; color: TagColor }>) {
      const tag = state.selectedTags.find(t => t.id === action.payload.id);
      if (tag) {
        tag.name = action.payload.name;
        tag.color = action.payload.color;
      }
    },
    removeSelectedTag(state, action: PayloadAction<string>) {
      state.selectedTags = state.selectedTags.filter(t => t.name !== action.payload);
    },
    clearTags(state) {
      state.selectedTags = [];
      state.tagInputValue = '';
    },
    
    setRepeatInterval(state, action: PayloadAction<RepeatOption>) {
      state.repeatInterval = action.payload;
    },
    setRepeatPublishTimeType(state, action: PayloadAction<'from_publish' | 'exact_time'>) {
      state.repeatPublishTimeType = action.payload;
    },
    setRepeatPublishHours(state, action: PayloadAction<number>) {
      state.repeatPublishHours = action.payload;
    },
    setRepeatPublishMinutes(state, action: PayloadAction<number>) {
      state.repeatPublishMinutes = action.payload;
    },
    setRepeatCustomDays(state, action: PayloadAction<number>) {
      state.repeatCustomDays = action.payload;
    },
    setRepeatCustomHours(state, action: PayloadAction<number>) {
      state.repeatCustomHours = action.payload;
    },
    setRepeatCustomUnit(state, action: PayloadAction<RepeatCustomUnit>) {
      state.repeatCustomUnit = action.payload;
    },
    setRepeatCustomValue(state, action: PayloadAction<number>) {
      state.repeatCustomValue = action.payload;
    },
    setRepeatWeekdays(state, action: PayloadAction<number[]>) {
      state.repeatWeekdays = action.payload;
    },
    setRepeatMonthDays(state, action: PayloadAction<number[]>) {
      state.repeatMonthDays = action.payload;
    },
    setRepeatYearMonth(state, action: PayloadAction<number>) {
      state.repeatYearMonth = action.payload;
    },
    setRepeatYearDays(state, action: PayloadAction<number[]>) {
      state.repeatYearDays = action.payload;
    },
    setRepeatEndType(state, action: PayloadAction<'never' | 'date'>) {
      state.repeatEndType = action.payload;
      if (action.payload === 'never') {
        state.repeatEndDate = null;
      }
    },
    setRepeatEndDate(state, action: PayloadAction<string | null>) {
      state.repeatEndDate = action.payload;
    },
    
    setAutoDeleteInterval(state, action: PayloadAction<AutoDeleteOption>) {
      state.autoDeleteInterval = action.payload;
    },
    setAutoDeleteCustomDays(state, action: PayloadAction<number>) {
      state.autoDeleteCustomDays = action.payload;
    },
    setAutoDeleteCustomHours(state, action: PayloadAction<number>) {
      state.autoDeleteCustomHours = action.payload;
    },
    
    setReplyToPostId(state, action: PayloadAction<number | null>) {
      state.replyToPostId = action.payload;
    },
    
    reset() {
      return initialState;
    },
  },
});

export const {
  setChannels,
  setChannelsLoading,
  toggleChannel,
  setShowCreateChannel,
  setNotifySubscribers,
  setPinPost,
  setRecentTags,
  setTagsLoading,
  setSearchResults,
  setSearching,
  setTagInputValue,
  setSelectedTagColor,
  addTag,
  updateSelectedTagId,
  updateSelectedTag,
  removeSelectedTag,
  clearTags,
  setRepeatInterval,
  setRepeatPublishTimeType,
  setRepeatPublishHours,
  setRepeatPublishMinutes,
  setRepeatCustomDays,
  setRepeatCustomHours,
  setRepeatCustomUnit,
  setRepeatCustomValue,
  setRepeatWeekdays,
  setRepeatMonthDays,
  setRepeatYearMonth,
  setRepeatYearDays,
  setRepeatEndType,
  setRepeatEndDate,
  setAutoDeleteInterval,
  setAutoDeleteCustomDays,
  setAutoDeleteCustomHours,
  setReplyToPostId,
  reset: resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
