import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { Draft } from '@/types/post';
import type { CalendarState, DayPageState } from './calendar';
import { fetchCalendarData, fetchMoreListPosts, fetchMoreDayPosts } from '../thunks';

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
      if (requestView !== state.currentView) return;
      state.isLoading = false;
      if (action.payload.type === 'grid') {
        const merge = action.payload.merge === true;
        const weekItems: Record<string, Draft[]> = merge ? { ...state.weekItems } : {};
        const dayPageState: Record<string, DayPageState> = merge ? { ...state.dayPageState } : {};
        for (const r of action.payload.results) {
          weekItems[r.dateKey] = r.items;
          dayPageState[r.dateKey] = { page: 1, hasMore: r.hasMore, isLoading: false };
        }
        state.weekItems = weekItems;
        state.dayPageState = dayPageState;
        state.items = [];
        state.hasMore = false;
        state.listTotal = 0;
      } else {
        const req = action.payload.request;
        const sig = [
          req.view,
          req.selectedDate,
          req.listRangeStart ?? '',
          req.listRangeEnd ?? '',
          req.listSortOrder ?? '',
          req.listStatusFilter ?? '',
        ].join('|');
        if (sig === state.lastLoadedListSignature && state.currentPage > 1) {
          state.listTotal = action.payload.total;
          return;
        }
        state.items = action.payload.items;
        state.weekItems = {};
        state.currentRangeKey = action.payload.rangeKey;
        state.lastLoadedListSignature = sig;
        state.currentPage = 1;
        state.listTotal = action.payload.total;
        state.hasMore = action.payload.hasMore;
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
    });
}
