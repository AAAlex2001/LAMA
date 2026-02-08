import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { DraftListResponse } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import {
  setDrafts,
  appendDrafts,
  removeDraft,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setPage,
  setTagIdsFilter,
} from '@/app/[locale]/create-post/store/slices/drafts';

const PAGE_SIZE = 20;

const filterDraftsByTagIds = (items: DraftListResponse['items'], tagIds: number[]) => {
  if (tagIds.length === 0) return items;
  return items.filter((draft) =>
    draft.tags?.some((tag) => tagIds.includes(tag.id))
  );
};

export const fetchDrafts = createAsyncThunk(
  'draftsPage/fetchDrafts',
  async (params: { tagIds?: number[] } = {}, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const tagIds = params.tagIds ?? [];
      const queryParams = new URLSearchParams({
        status: 'draft',
        page: '1',
        page_size: String(PAGE_SIZE),
      });
      tagIds.forEach((id) => queryParams.append('tag_ids', String(id)));
      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`
      );
      const filteredItems = filterDraftsByTagIds(response.items, tagIds);
      dispatch(setDrafts(filteredItems));
      dispatch(setTagIdsFilter(tagIds));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(1));
      return filteredItems;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновиков');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchMoreDrafts = createAsyncThunk(
  'draftsPage/fetchMoreDrafts',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { page, isLoadingMore, hasMore, tagIdsFilter } = state.drafts;

    if (isLoadingMore || !hasMore) return;

    dispatch(setIsLoadingMore(true));
    try {
      const nextPage = page + 1;
      const queryParams = new URLSearchParams({
        status: 'draft',
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      });
      tagIdsFilter.forEach((id) => queryParams.append('tag_ids', String(id)));
      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`
      );
      const filteredItems = filterDraftsByTagIds(response.items, tagIdsFilter);
      dispatch(appendDrafts(filteredItems));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(nextPage));
      return filteredItems;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoadingMore(false));
    }
  }
);

export const deleteDraftThunk = createAsyncThunk(
  'draftsPage/deleteDraft',
  async (draftId: number, { dispatch, rejectWithValue }) => {
    dispatch(removeDraft(draftId));
    try {
      await apiRequest(`/publications/${draftId}`, { method: 'DELETE' });
      return draftId;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }
);
