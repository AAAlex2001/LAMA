import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { TextTemplate, TextTemplateListResponse } from '../types';
import { apiRequest } from './api';
import {
  setTemplates,
  appendTemplates,
  updateTemplate as updateTemplateAction,
  removeTemplate,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setPage,
} from '../slices/templates';

const PAGE_SIZE = 20;

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const response = await apiRequest<TextTemplateListResponse>(
        `/publications/text-templates/?limit=${PAGE_SIZE}&skip=0`
      );
      dispatch(setTemplates(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(1));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки шаблонов');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchMoreTemplates = createAsyncThunk(
  'templates/fetchMoreTemplates',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { page, isLoadingMore, hasMore } = state.templates;
    
    if (isLoadingMore || !hasMore) return;
    
    dispatch(setIsLoadingMore(true));
    try {
      const skip = page * PAGE_SIZE;
      const response = await apiRequest<TextTemplateListResponse>(
        `/publications/text-templates/?limit=${PAGE_SIZE}&skip=${skip}`
      );
      dispatch(appendTemplates(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(page + 1));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoadingMore(false));
    }
  }
);

export const updateTemplateThunk = createAsyncThunk(
  'templates/updateTemplate',
  async ({ id, changes }: { id: number; changes: Partial<TextTemplate> }, { dispatch, rejectWithValue }) => {
    try {
      await apiRequest(`/publications/text-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      dispatch(updateTemplateAction({ id, changes }));
      return { id, changes };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  }
);

export const deleteTemplateThunk = createAsyncThunk(
  'templates/deleteTemplate',
  async (templateId: number, { dispatch, rejectWithValue }) => {
    try {
      await apiRequest(`/publications/text-templates/${templateId}`, { method: 'DELETE' });
      dispatch(removeTemplate(templateId));
      return templateId;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }
);

export const searchTemplates = createAsyncThunk(
  'templates/searchTemplates',
  async (query: string, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const response = await apiRequest<TextTemplateListResponse>(
        `/publications/text-templates/?search=${encodeURIComponent(query)}&limit=${PAGE_SIZE}`
      );
      dispatch(setTemplates(response.items));
      dispatch(setHasMore(false));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);
