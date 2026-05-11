import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CalendarView = 'day' | 'week' | 'month' | 'list';

export type DayStatusCount = {
  published: number;
  scheduled: number;
  draft: number;
  bot_messages: number;
};

export interface CalendarState {
  selectedDate: string;
  sidebarDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  currentView: CalendarView;
  countsMonthAnchor: string;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
}

const todayStr = new Date().toISOString().split('T')[0];
const todayMonthAnchor = `${todayStr.slice(0, 7)}-01`;

export const initialState: CalendarState = {
  selectedDate: todayStr,
  sidebarDate: todayStr,
  listRangeStart: null,
  listRangeEnd: null,
  currentView: 'day',
  countsMonthAnchor: todayMonthAnchor,
  listSortOrder: null,
  listStatusFilter: null,
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
  },
});

export const {
  setSelectedDate, setSidebarDate, setListDateRange, clearListDateRange,
  setCurrentView, setListSortOrder, setListStatusFilter, setCountsMonthAnchor,
} = calendarSlice.actions;

export default calendarSlice.reducer;
