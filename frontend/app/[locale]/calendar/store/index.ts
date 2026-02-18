import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { Draft } from '@/app/[locale]/create-post/store/types';

export type CalendarView = 'day' | 'week' | 'month' | 'list';

export type DayPageState = {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
};

interface CalendarState {
  items: Draft[];
  weekItems: Record<string, Draft[]>;
  isLoading: boolean;
  selectedDate: string;
  sidebarDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  currentView: CalendarView;
  monthPostCounts: Record<string, number>;
  countsMonthAnchor: string;
  currentRangeKey: string;
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  dayPageState: Record<string, DayPageState>;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
}

const initialState: CalendarState = {
  items: [],
  weekItems: {},
  isLoading: false,
  selectedDate: new Date().toISOString().split('T')[0],
  sidebarDate: new Date().toISOString().split('T')[0],
  listRangeStart: null,
  listRangeEnd: null,
  currentView: 'day',
  monthPostCounts: {},
  countsMonthAnchor: new Date().toISOString().split('T')[0],
  currentRangeKey: '',
  currentPage: 1,
  hasMore: false,
  isLoadingMore: false,
  dayPageState: {},
  listSortOrder: null,
  listStatusFilter: null,
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<Draft[]>) => {
      state.items = action.payload;
    },
    setWeekItems: (state, action: PayloadAction<Record<string, Draft[]>>) => {
      state.weekItems = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
      state.sidebarDate = action.payload;
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
    setMonthPostCounts: (state, action: PayloadAction<Record<string, number>>) => {
      state.monthPostCounts = action.payload;
    },
    setCountsMonthAnchor: (state, action: PayloadAction<string>) => {
      state.countsMonthAnchor = action.payload;
    },
    setCurrentRangeKey: (state, action: PayloadAction<string>) => {
      state.currentRangeKey = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    setIsLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },
    setDayPageState: (state, action: PayloadAction<Record<string, DayPageState>>) => {
      state.dayPageState = action.payload;
    },
    patchDayPageState: (state, action: PayloadAction<{ dateKey: string; value: DayPageState }>) => {
      state.dayPageState[action.payload.dateKey] = action.payload.value;
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((d) => d.id !== action.payload);
      for (const key of Object.keys(state.weekItems)) {
        state.weekItems[key] = state.weekItems[key].filter((d) => d.id !== action.payload);
      }
    },
  },
});

export const {
  setItems,
  setWeekItems,
  setIsLoading,
  setSelectedDate,
  setSidebarDate,
  setListDateRange,
  clearListDateRange,
  setCurrentView,
  setListSortOrder,
  setListStatusFilter,
  setMonthPostCounts,
  setCountsMonthAnchor,
  setCurrentRangeKey,
  setCurrentPage,
  setHasMore,
  setIsLoadingMore,
  setDayPageState,
  patchDayPageState,
  removeItem,
} = calendarSlice.actions;

export const calendarStore = configureStore({
  reducer: {
    calendar: calendarSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof calendarStore.getState>;
export type AppDispatch = typeof calendarStore.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
