import { setSelectedDate, setSidebarDate } from '../slices/calendar';
import type { CalendarView } from '../slices/calendar';
import type { RootState, AppDispatch } from '../index';
import { parseDate, formatDateOnly, getWeekStart } from '../../utils/calendar-helpers';

type ThunkAction = (dispatch: AppDispatch, getState: () => RootState) => void;

const STEP: Record<CalendarView, [number, 'day' | 'week' | 'month' | 'year']> = {
  day: [1, 'day'], week: [1, 'week'], month: [1, 'month'], list: [1, 'year'],
};

/** Навигация стрелками: сдвиг на шаг в зависимости от текущего вида */
export function navigateStep(direction: 'prev' | 'next'): ThunkAction {
  return (dispatch, getState) => {
    const { currentView, selectedDate } = getState().calendar;
    const d = new Date(parseDate(selectedDate));
    const [amount, unit] = STEP[currentView];
    const delta = direction === 'prev' ? -amount : amount;

    if (unit === 'day') d.setDate(d.getDate() + delta);
    else if (unit === 'week') d.setDate(d.getDate() + delta * 7);
    else if (unit === 'month') d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);

    dispatch(setSelectedDate(formatDateOnly(d)));
  };
}

/** Клик по дате в сайдбаре: умная логика для week/month */
export function sidebarDateChange(date: Date): ThunkAction {
  return (dispatch, getState) => {
    const { currentView, selectedDate } = getState().calendar;
    const sel = parseDate(selectedDate);

    if (currentView === 'week') {
      dispatch(setSidebarDate(formatDateOnly(date)));
      if (getWeekStart(sel).getTime() !== getWeekStart(date).getTime()) {
        dispatch(setSelectedDate(formatDateOnly(date)));
      }
    } else if (currentView === 'month') {
      dispatch(setSidebarDate(formatDateOnly(date)));
      if (date.getMonth() !== sel.getMonth() || date.getFullYear() !== sel.getFullYear()) {
        dispatch(setSelectedDate(formatDateOnly(date)));
      }
    } else {
      dispatch(setSelectedDate(formatDateOnly(date)));
    }
  };
}
