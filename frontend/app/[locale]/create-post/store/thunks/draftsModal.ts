import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { DraftListResponse } from '../types';
import { apiRequest } from './api';
import {
  setDrafts,
  appendDrafts,
  removeDraft,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setPage,
} from '../slices/drafts';

const PAGE_SIZE = 20;

export const fetchDrafts = createAsyncThunk(
  'drafts/fetchDrafts',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const response = await apiRequest<DraftListResponse>(
        `/publications?status=draft&page=1&page_size=${PAGE_SIZE}`
      );
      dispatch(setDrafts(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(1));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновиков');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchMoreDrafts = createAsyncThunk(
  'drafts/fetchMoreDrafts',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { page, isLoadingMore, hasMore } = state.drafts;
    
    if (isLoadingMore || !hasMore) return;
    
    dispatch(setIsLoadingMore(true));
    try {
      const nextPage = page + 1;
      const response = await apiRequest<DraftListResponse>(
        `/publications?status=draft&page=${nextPage}&page_size=${PAGE_SIZE}`
      );
      dispatch(appendDrafts(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(nextPage));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoadingMore(false));
    }
  }
);

export const deleteDraftThunk = createAsyncThunk(
  'drafts/deleteDraft',
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

export const searchDrafts = createAsyncThunk(
  'drafts/searchDrafts',
  async (query: string, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const response = await apiRequest<DraftListResponse>(
        `/publications?status=draft&search=${encodeURIComponent(query)}&page=1&page_size=${PAGE_SIZE}`
      );
      dispatch(setDrafts(response.items));
      dispatch(setHasMore(false));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);
