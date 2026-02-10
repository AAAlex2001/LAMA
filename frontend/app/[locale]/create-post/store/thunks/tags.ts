import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Tag, TagsResponse } from '../types';
import { apiRequest } from './api';
import { 
  setRecentTags, 
  appendRecentTags,
  setPage,
  setHasMore,
  setTotal,
  setSearchResults, 
  setLoading, 
  setLoadingMore,
  setSearching, 
  setError, 
  removeTag,
  updateTagInList,
  resetPagination,
} from '../slices/tags';

const PAGE_SIZE = 20;

export const fetchTagsThunk = createAsyncThunk(
  'tags/fetchTags',
  async (params: { page?: number; pageSize?: number; force?: boolean; append?: boolean } = {}, { getState, dispatch, rejectWithValue }) => {
    const { pageSize = PAGE_SIZE, force = false, append = false } = params;
    const state = getState() as { tags: { recentTags: Tag[]; loading: boolean; loadingMore: boolean; page: number } };
    
    if (state.tags.loading || state.tags.loadingMore) return;

    const page = params.page ?? (append ? state.tags.page + 1 : 1);

    if (append) {
      dispatch(setLoadingMore(true));
    } else {
      dispatch(setLoading(true));
    }
    dispatch(setError(null));
    
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      
      const response = await apiRequest<TagsResponse>(
        `/publications/tags/?${queryParams}`,
        { method: 'GET' }
      );

      const items = response.items || [];
      const total = response.total || 0;
      
      if (append) {
        dispatch(appendRecentTags(items));
      } else {
        dispatch(setRecentTags(items));
      }

      dispatch(setPage(page));
      dispatch(setTotal(total));
      dispatch(setHasMore(page * pageSize < total));

      return items;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки тегов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
      dispatch(setLoadingMore(false));
    }
  }
);

export const searchTagsThunk = createAsyncThunk(
  'tags/searchTags',
  async (query: string, { dispatch, rejectWithValue }) => {
    if (!query.trim()) {
      dispatch(setSearchResults([]));
      return [];
    }
    
    dispatch(setSearching(true));
    
    try {
      const queryParams = new URLSearchParams({
        q: query.trim(),
        limit: String(10),
      });
      
      const response = await apiRequest<TagsResponse>(
        `/publications/tags/search?${queryParams}`,
        { method: 'GET' }
      );
      
      dispatch(setSearchResults(response.items || []));
      return response.items;
    } catch (error) {
      console.error('Search tags error:', error);
      dispatch(setSearchResults([]));
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка поиска');
    } finally {
      dispatch(setSearching(false));
    }
  }
);

export const createTagThunk = createAsyncThunk(
  'tags/createTag',
  async ({ name, color }: { name: string; color?: string }, { dispatch, rejectWithValue }) => {
    if (!name.trim()) {
      return rejectWithValue('Имя тега не может быть пустым');
    }
    
    try {
      const response = await apiRequest<Tag>(
        '/publications/tags/',
        {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), color: color || null }),
        }
      );
      
      dispatch(fetchTagsThunk({ force: true }));
      
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка создания тега');
    }
  }
);

export const deleteTagThunk = createAsyncThunk(
  'tags/deleteTag',
  async (tagId: number, { dispatch, rejectWithValue }) => {
    try {
      await apiRequest(
        `/publications/tags/${tagId}`,
        { method: 'DELETE' }
      );
      
      dispatch(removeTag(tagId));
      return tagId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка удаления тега');
    }
  }
);

export const updateTagThunk = createAsyncThunk(
  'tags/updateTag',
  async ({ id, name, color }: { id: number; name?: string; color?: string }, { dispatch, rejectWithValue }) => {
    try {
      const body: Record<string, string> = {};
      if (name !== undefined) body.name = name.trim();
      if (color !== undefined) body.color = color;

      const response = await apiRequest<Tag>(
        `/publications/tags/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );

      dispatch(updateTagInList(response));
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка обновления тега');
    }
  }
);
