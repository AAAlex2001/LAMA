import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { sortPostsByTime } from '../utils/post-helpers';
import { parseDate } from '../utils/calendar-helpers';
import { buildFilterConfigs } from '../utils/buildFilterConfigs';

const selectCalendar = (s: RootState) => s.calendar;

export const selectSortedPosts = createSelector(
  [(s: RootState) => s.calendar.items, (s: RootState) => s.calendar.currentView],
  (items, view) => view === 'list' ? items : sortPostsByTime(items, 'desc'),
);

export const selectSidebarPosts = createSelector(
  [
    (s: RootState) => s.calendar.currentView,
    (s: RootState) => s.calendar.weekItems,
    (s: RootState) => s.calendar.sidebarDate,
    (s: RootState) => s.calendar.items,
  ],
  (view, weekItems, sidebarDate, items) =>
    ['week', 'month'].includes(view)
      ? sortPostsByTime(weekItems[sidebarDate] || [])
      : sortPostsByTime(items),
);

export const selectMobilePosts = createSelector(
  [
    (s: RootState) => s.calendar.currentView,
    (s: RootState) => s.calendar.weekItems,
    (s: RootState) => s.calendar.sidebarDate,
    selectSortedPosts,
  ],
  (view, weekItems, sidebarDate, sortedPosts) =>
    ['week', 'month'].includes(view)
      ? sortPostsByTime(weekItems[sidebarDate] || [])
      : sortedPosts,
);

export const selectGridPostCounts = createSelector(
  [
    (s: RootState) => s.calendar.monthPostCounts,
    (s: RootState) => s.calendar.currentView,
    (s: RootState) => s.calendar.selectedDate,
    (s: RootState) => s.calendar.items,
  ],
  (monthCounts, currentView, selectedDate, items) => {
    const merged: Record<string, number> = { ...monthCounts };
    if (currentView === 'day') {
      merged[selectedDate] = items.length;
    }
    return merged;
  },
);

export const selectDayLoadingMap = createSelector(
  [(s: RootState) => s.calendar.dayPageState],
  (dps) => Object.fromEntries(Object.entries(dps).map(([k, v]) => [k, v.isLoading])),
);

export const selectDayHasMoreMap = createSelector(
  [(s: RootState) => s.calendar.dayPageState],
  (dps) => Object.fromEntries(Object.entries(dps).map(([k, v]) => [k, v.hasMore])),
);

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

export const selectMonthStatusCounts = createSelector(
  [(s: RootState) => s.calendar.monthStatusCounts],
  (statusCounts) => statusCounts,
);

export const selectMobileFilterConfigs = createSelector(
  [selectCalendar, selectIsGridView, selectSidebarPosts, selectSortedPosts],
  (calendar, isGridView, sidebarPosts, sortedPosts) => {
    const isList = calendar.currentView === 'list';
    return buildFilterConfigs(isGridView ? sidebarPosts : sortedPosts, {
      withDateSort: isList,
      withStatusFilter: isList,
      withStatsFilters: isList,
    });
  },
);
