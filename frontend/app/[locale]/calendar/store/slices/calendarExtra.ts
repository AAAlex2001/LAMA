import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { Draft } from '@/types/post';
import type { CalendarState, DayPageState } from './calendar';
import { fetchCalendarData, fetchMoreListPosts, fetchMoreDayPosts, fetchDayCounts } from '../thunks';

export function buildExtraReducers(builder: ActionReducerMapBuilder<CalendarState>) {
  builder
    .addCase(fetchCalendarData.pending, (state) => {
      if (state.currentView === 'month') {
        const dayKey = state.sidebarDate;
        if (!state.weekItems[dayKey] || state.weekItems[dayKey].length === 0) {
          state.dayPageState[dayKey] = { page: 1, hasMore: false, isLoading: true };
        }
        if (Object.keys(state.weekItems).length === 0) {
          state.isLoading = true;
        }
        return;
      }
      state.isLoading = true;
    })
    .addCase(fetchCalendarData.fulfilled, (state, action) => {
      const requestView = action.payload.request.view;
      if (requestView !== state.currentView) {
        return;
      }
      state.isLoading = false;
      if (action.payload.type === 'grid') {
        const merge = action.payload.merge === true;
        const weekItems: Record<string, Draft[]> = merge ? { ...state.weekItems } : {};
        const dayPageState: Record<string, DayPageState> = merge ? { ...state.dayPageState } : {};
        for (const r of action.payload.results) {
          weekItems[r.dateKey] = r.items;
          dayPageState[r.dateKey] = { page: 1, hasMore: r.hasMore, isLoading: false };
          if (!merge || state.monthPostCounts[r.dateKey] === undefined) {
            state.monthPostCounts[r.dateKey] = r.total;
          }
          if (!merge || !state.monthStatusCounts[r.dateKey]) {
            if (r.items.length > 0) {
              const sc = { published: 0, scheduled: 0, draft: 0, bot_messages: 0 };
              for (const item of r.items) {
                if ((item as any).is_bot_message) sc.bot_messages++;
                else if (item.status === 'published') sc.published++;
                else if (item.status === 'scheduled') sc.scheduled++;
                else if (item.status === 'draft') sc.draft++;
              }
              state.monthStatusCounts[r.dateKey] = sc;
            }
          }
        }
        state.weekItems = weekItems;
        state.dayPageState = dayPageState;
        state.items = [];
        state.hasMore = false;
        state.listTotal = 0;
      } else {
        state.items = action.payload.items;
        state.weekItems = {};
        state.currentRangeKey = action.payload.rangeKey;
        state.currentPage = 1;
        state.listTotal = action.payload.total;
        state.hasMore = action.payload.hasMore;
        if (state.currentView === 'day') {
          state.monthPostCounts[state.selectedDate] = action.payload.items.length;
        }
      }
    })
    .addCase(fetchCalendarData.rejected, (state) => {
      state.isLoading = false;
      state.hasMore = false;
      state.listTotal = 0;
    })

    .addCase(fetchMoreListPosts.pending, (state) => { state.isLoadingMore = true; })
    .addCase(fetchMoreListPosts.fulfilled, (state, action) => {
      state.isLoadingMore = false;
      state.items = action.payload.items;
      state.currentPage = action.payload.page;
      state.listTotal = action.payload.total;
      state.hasMore = action.payload.hasMore;
    })
    .addCase(fetchMoreListPosts.rejected, (state) => { state.isLoadingMore = false; })

    .addCase(fetchMoreDayPosts.pending, (state, action) => {
      const s = state.dayPageState[action.meta.arg];
      if (s) s.isLoading = true;
    })
    .addCase(fetchMoreDayPosts.fulfilled, (state, action) => {
      const { dateKey, items, page, hasMore } = action.payload;
      state.weekItems[dateKey] = items;
      state.dayPageState[dateKey] = { page, hasMore, isLoading: false };
    })
    .addCase(fetchMoreDayPosts.rejected, (state, action) => {
      const s = state.dayPageState[action.meta.arg];
      if (s) s.isLoading = false;
    })

    .addCase(fetchDayCounts.fulfilled, (state, action) => {
      if (action.payload.anchor !== state.countsMonthAnchor) {
        return;
      }
      state.monthPostCountsCache[action.payload.monthKey] = action.payload.counts;
      const merged = { ...action.payload.counts };
      for (const dateKey of Object.keys(state.weekItems)) {
        if (state.monthPostCounts[dateKey] !== undefined) {
          merged[dateKey] = state.monthPostCounts[dateKey];
        }
      }
      state.monthPostCounts = merged;
      state.monthStatusCountsCache[action.payload.monthKey] = action.payload.statusCounts;
      const mergedStatus = { ...action.payload.statusCounts };
      for (const dateKey of Object.keys(state.weekItems)) {
        const items = state.weekItems[dateKey];
        if (items && items.length > 0 && !mergedStatus[dateKey]) {
          const sc = { published: 0, scheduled: 0, draft: 0, bot_messages: 0 };
          for (const item of items) {
            if ((item as any).is_bot_message) sc.bot_messages++;
            else if (item.status === 'published') sc.published++;
            else if (item.status === 'scheduled') sc.scheduled++;
            else if (item.status === 'draft') sc.draft++;
          }
          mergedStatus[dateKey] = sc;
        }
      }
      state.monthStatusCounts = mergedStatus;
    });
}
