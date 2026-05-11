import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import calendarReducer from './slices/calendar';

export const calendarStore = configureStore({
  reducer: { calendar: calendarReducer },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof calendarStore.getState>;
export type AppDispatch = typeof calendarStore.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export type { CalendarView, DayStatusCount, CalendarState } from './slices/calendar';
export {
  setSelectedDate, setSidebarDate, setListDateRange, clearListDateRange,
  setCurrentView, setListSortOrder, setListStatusFilter, setCountsMonthAnchor,
} from './slices/calendar';
export {
  selectSelectedDateObj, selectSidebarDateObj,
  selectListRangeStartObj, selectListRangeEndObj,
  selectIsGridView,
} from './selectors';
