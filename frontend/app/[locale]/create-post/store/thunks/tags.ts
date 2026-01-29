import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Tag, TagsResponse } from '../types';
import { apiRequest } from './api';
import { 
  setRecentTags, 
  setSearchResults, 
  setLoading, 
  setSearching, 
  setError, 
  removeTag 
} from '../slices/tags';

// Загрузка списка тегов
export const fetchTagsThunk = createAsyncThunk(
  'tags/fetchTags',
  async (params: { page?: number; pageSize?: number; force?: boolean } = {}, { getState, dispatch, rejectWithValue }) => {
    const { page = 1, pageSize = 20, force = false } = params;
    const state = getState() as { tags: { recentTags: Tag[]; loading: boolean } };
    
    // Если уже загружаются или есть данные и не forced reload
    if (state.tags.loading) return;
    if (!force && state.tags.recentTags.length > 0) return;
    
    dispatch(setLoading(true));
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
      
      dispatch(setRecentTags(response.items || []));
      return response.items;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки тегов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Поиск тегов
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

// Создание нового тега
export const createTagThunk = createAsyncThunk(
  'tags/createTag',
  async (name: string, { dispatch, rejectWithValue }) => {
    if (!name.trim()) {
      return rejectWithValue('Имя тега не может быть пустым');
    }
    
    try {
      const response = await apiRequest<Tag>(
        '/publications/tags/',
        {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      
      // После создания тега перезагружаем список
      dispatch(fetchTagsThunk({ force: true }));
      
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка создания тега');
    }
  }
);

// Удаление тега
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
