import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { sortPostsByTime } from '../utils/post-helpers';

export const selectSortedPosts = createSelector(
  [(s: RootState) => s.calendar.items],
  (items) => sortPostsByTime(items),
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
    (s: RootState) => s.calendar.weekItems,
    (s: RootState) => s.calendar.currentView,
    (s: RootState) => s.calendar.selectedDate,
    (s: RootState) => s.calendar.items,
  ],
  (monthCounts, weekItems, currentView, selectedDate, items) => {
    const merged: Record<string, number> = {};
    const allKeys = new Set([...Object.keys(monthCounts), ...Object.keys(weekItems)]);
    for (const key of allKeys) {
      if (Object.prototype.hasOwnProperty.call(weekItems, key)) {
        merged[key] = weekItems[key]?.length || 0;
      } else {
        merged[key] = monthCounts[key] || 0;
      }
    }
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
