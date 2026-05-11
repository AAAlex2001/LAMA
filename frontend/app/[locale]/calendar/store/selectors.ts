import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { parseDate } from '../utils/calendar-helpers';

const selectCalendar = (s: RootState) => s.calendar;

export const selectSelectedDateObj = createSelector(
  [selectCalendar],
  (calendar) => parseDate(calendar.selectedDate),
);

export const selectSidebarDateObj = createSelector(
  [selectCalendar],
  (calendar) => parseDate(calendar.sidebarDate),
);

export const selectListRangeStartObj = createSelector(
  [selectCalendar],
  (calendar) => (calendar.listRangeStart ? parseDate(calendar.listRangeStart) : null),
);

export const selectListRangeEndObj = createSelector(
  [selectCalendar],
  (calendar) => (calendar.listRangeEnd ? parseDate(calendar.listRangeEnd) : null),
);

export const selectIsGridView = createSelector(
  [selectCalendar],
  (calendar) => calendar.currentView === 'week' || calendar.currentView === 'month',
);
