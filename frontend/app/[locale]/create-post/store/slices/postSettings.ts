import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';

export interface PostSettingsState {
  notifySubscribers: boolean;
  pinPost: boolean;
  showCreateChannel: boolean;
  
  selectedTagName: string | null;
  selectedTagColor: TagColor;
  
  repeatInterval: RepeatOption;
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
  
  protectContent: boolean;
  replyToPostId: number | null;
}

const initialState: PostSettingsState = {
  notifySubscribers: true,
  pinPost: false,
  showCreateChannel: false,
  
  selectedTagName: null,
  selectedTagColor: '#FAC7C7',
  
  repeatInterval: 'never',
  repeatCustomDays: 0,
  repeatCustomHours: 0,
  repeatCustomUnit: 'days',
  repeatCustomValue: 1,
  repeatWeekdays: [],
  repeatMonthDays: [new Date().getDate()],
  repeatYearMonth: new Date().getMonth(),
  repeatYearDays: [new Date().getDate()],
  repeatEndType: 'never',
  repeatEndDate: null,
  
  autoDeleteInterval: 'never',
  autoDeleteCustomDays: 0,
  autoDeleteCustomHours: 0,
  
  protectContent: false,
  replyToPostId: null,
};

const postSettingsSlice = createSlice({
  name: 'postSettings',
  initialState,
  reducers: {
    setNotifySubscribers(state, action: PayloadAction<boolean>) {
      state.notifySubscribers = action.payload;
    },
    setPinPost(state, action: PayloadAction<boolean>) {
      state.pinPost = action.payload;
    },
    setShowCreateChannel(state, action: PayloadAction<boolean>) {
      state.showCreateChannel = action.payload;
    },
    
    selectTag(state, action: PayloadAction<{ name: string; color: TagColor }>) {
      state.selectedTagName = action.payload.name;
      state.selectedTagColor = action.payload.color;
    },
    clearTag(state) {
      state.selectedTagName = null;
      state.selectedTagColor = '#FAC7C7';
    },
    setTagColor(state, action: PayloadAction<TagColor>) {
      state.selectedTagColor = action.payload;
    },
    
    setRepeatInterval(state, action: PayloadAction<RepeatOption>) {
      state.repeatInterval = action.payload;
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
    
    setProtectContent(state, action: PayloadAction<boolean>) {
      state.protectContent = action.payload;
    },
    setReplyToPostId(state, action: PayloadAction<number | null>) {
      state.replyToPostId = action.payload;
    },
    
    resetPostSettings() {
      return initialState;
    },
  },
});

export const {
  setNotifySubscribers,
  setPinPost,
  setShowCreateChannel,
  selectTag,
  clearTag,
  setTagColor,
  setRepeatInterval,
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
  setProtectContent,
  setReplyToPostId,
  resetPostSettings,
} = postSettingsSlice.actions;

export default postSettingsSlice.reducer;
