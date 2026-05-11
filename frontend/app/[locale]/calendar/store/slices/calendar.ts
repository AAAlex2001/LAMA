import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from '@/types/post';
import { buildExtraReducers } from './calendarExtra';

export type CalendarView = 'day' | 'week' | 'month' | 'list';

export type DayPageState = {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
};

export type DayStatusCount = {
  published: number;
  scheduled: number;
  draft: number;
  bot_messages: number;
};

export interface CalendarState {
  items: Draft[];
  weekItems: Record<string, Draft[]>;
  isLoading: boolean;
  selectedDate: string;
  sidebarDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  currentView: CalendarView;
  countsMonthAnchor: string;
  currentRangeKey: string;
  currentPage: number;
  hasMore: boolean;
  listTotal: number;
  isLoadingMore: boolean;
  dayPageState: Record<string, DayPageState>;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
  lastLoadedListSignature: string;
}

const todayStr = new Date().toISOString().split('T')[0];
const todayMonthAnchor = `${todayStr.slice(0, 7)}-01`;

export const initialState: CalendarState = {
  items: [],
  weekItems: {},
  isLoading: false,
  selectedDate: todayStr,
  sidebarDate: todayStr,
  listRangeStart: null,
  listRangeEnd: null,
  currentView: 'day',
  countsMonthAnchor: todayMonthAnchor,
  currentRangeKey: '',
  currentPage: 1,
  hasMore: false,
  listTotal: 0,
  isLoadingMore: false,
  dayPageState: {},
  listSortOrder: null,
  listStatusFilter: null,
  lastLoadedListSignature: '',
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
      state.sidebarDate = action.payload;
      state.countsMonthAnchor = `${action.payload.slice(0, 7)}-01`;
    },
    setSidebarDate: (state, action: PayloadAction<string>) => {
      state.sidebarDate = action.payload;
    },
    setListDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.listRangeStart = action.payload.start;
      state.listRangeEnd = action.payload.end;
    },
    clearListDateRange: (state) => {
      state.listRangeStart = null;
      state.listRangeEnd = null;
    },
    setCurrentView: (state, action: PayloadAction<CalendarView>) => {
      state.currentView = action.payload;
    },
    setListSortOrder: (state, action: PayloadAction<'asc' | 'desc' | null>) => {
      state.listSortOrder = action.payload;
    },
    setListStatusFilter: (state, action: PayloadAction<string | null>) => {
      state.listStatusFilter = action.payload;
    },
    setCountsMonthAnchor: (state, action: PayloadAction<string>) => {
      state.countsMonthAnchor = action.payload;
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((d) => d.id !== action.payload);
      for (const key of Object.keys(state.weekItems)) {
        state.weekItems[key] = state.weekItems[key].filter((d) => d.id !== action.payload);
      }
    },
  },
  extraReducers: buildExtraReducers,
});

export const {
  setSelectedDate, setSidebarDate, setListDateRange, clearListDateRange,
  setCurrentView, setListSortOrder, setListStatusFilter, setCountsMonthAnchor, removeItem,
} = calendarSlice.actions;

export default calendarSlice.reducer;
