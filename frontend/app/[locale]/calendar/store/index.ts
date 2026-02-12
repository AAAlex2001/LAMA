import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { Draft } from '@/app/[locale]/create-post/store/types';

export type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarState {
  items: Draft[];
  weekItems: Record<string, Draft[]>;
  isLoading: boolean;
  selectedDate: string;
  currentView: CalendarView;
}

const initialState: CalendarState = {
  items: [],
  weekItems: {},
  isLoading: false,
  selectedDate: new Date().toISOString().split('T')[0],
  currentView: 'day',
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
    },
    setCurrentView: (state, action: PayloadAction<CalendarView>) => {
      state.currentView = action.payload;
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((d) => d.id !== action.payload);
      for (const key of Object.keys(state.weekItems)) {
        state.weekItems[key] = state.weekItems[key].filter((d) => d.id !== action.payload);
      }
    },
  },
});

export const { setItems, setWeekItems, setIsLoading, setSelectedDate, setCurrentView, removeItem } = calendarSlice.actions;

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
