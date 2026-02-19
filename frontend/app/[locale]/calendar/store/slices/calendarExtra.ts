import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import type { CalendarState, DayPageState } from './calendar';
import { fetchCalendarData, fetchMoreListPosts, fetchMoreDayPosts, fetchDayCounts } from '../thunks';

export function buildExtraReducers(builder: ActionReducerMapBuilder<CalendarState>) {
  builder
    .addCase(fetchCalendarData.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(fetchCalendarData.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload.type === 'grid') {
        const weekItems: Record<string, Draft[]> = {};
        const dayPageState: Record<string, DayPageState> = {};
        for (const r of action.payload.results) {
          weekItems[r.dateKey] = r.items;
          dayPageState[r.dateKey] = { page: 1, hasMore: r.hasMore, isLoading: false };
        }
        state.weekItems = weekItems;
        state.dayPageState = dayPageState;
        state.items = [];
        state.hasMore = false;
      } else {
        state.items = action.payload.items;
        state.weekItems = {};
        state.currentRangeKey = action.payload.rangeKey;
        state.currentPage = 1;
        state.hasMore = action.payload.hasMore;
      }
    })
    .addCase(fetchCalendarData.rejected, (state) => {
      state.isLoading = false;
      state.hasMore = false;
    })

    .addCase(fetchMoreListPosts.pending, (state) => { state.isLoadingMore = true; })
    .addCase(fetchMoreListPosts.fulfilled, (state, action) => {
      state.isLoadingMore = false;
      state.items = action.payload.items;
      state.currentPage = action.payload.page;
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
      state.monthPostCounts = action.payload;
    });
}
