import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { DraftListResponse } from '@/types/post';
import { apiRequest } from '@/store/api';
import { groupSeriesPosts } from '@/app/[locale]/calendar/utils/groupSeries';
import {
  setDrafts,
  appendDrafts,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setPage,
  setTagIdsFilter,
} from '../slices/draftListSlice';

const PAGE_SIZE = 30;

function areTagIdsEqual(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export const fetchDrafts = createAsyncThunk(
  'drafts/fetchDrafts',
  async (params: { tagIds?: number[] } = {}, { dispatch, getState, rejectWithValue }) => {
    const requestedTagIds = params.tagIds ?? [];
    const requestedSortOrder = (getState() as RootState).drafts.sortOrder;

    dispatch(setTagIdsFilter(requestedTagIds));
    dispatch(setIsLoading(true));
    try {
      const queryParams = new URLSearchParams({
        status: 'draft',
        page: '1',
        page_size: String(PAGE_SIZE),
        sort_order: requestedSortOrder,
      });
      requestedTagIds.forEach((id) => queryParams.append('tag_ids', String(id)));
      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`,
      );

      const currentState = (getState() as RootState).drafts;
      const isStaleResponse =
        currentState.sortOrder !== requestedSortOrder
        || !areTagIdsEqual(currentState.tagIdsFilter, requestedTagIds);

      if (isStaleResponse) {
        return response.items;
      }

      dispatch(setDrafts(groupSeriesPosts(response.items)));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(1));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновиков');
    } finally {
      dispatch(setIsLoading(false));
    }
  },
);

export const fetchMoreDrafts = createAsyncThunk(
  'drafts/fetchMoreDrafts',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { page, isLoadingMore, hasMore, tagIdsFilter, sortOrder } = state.drafts;

    if (isLoadingMore || !hasMore) return;

    dispatch(setIsLoadingMore(true));
    try {
      const nextPage = page + 1;
      const queryParams = new URLSearchParams({
        status: 'draft',
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
        sort_order: sortOrder,
      });
      tagIdsFilter.forEach((id) => queryParams.append('tag_ids', String(id)));
      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`,
      );
      dispatch(appendDrafts(groupSeriesPosts(response.items)));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(nextPage));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoadingMore(false));
    }
  },
);
