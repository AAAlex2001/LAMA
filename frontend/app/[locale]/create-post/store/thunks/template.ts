import { createAsyncThunk } from '@reduxjs/toolkit';
import { setIsSavingTemplate } from '../slices/ui';
import type { RootState } from '../index';
import { apiRequest } from './api';

export const saveAsTemplate = createAsyncThunk(
  'createPost/saveAsTemplate',
  async (selectedHtml: string | undefined, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const html = (selectedHtml || state.editor.text || '').trim();
    
    if (!html) return rejectWithValue('Текст шаблона пустой');
    
    dispatch(setIsSavingTemplate(true));
    
    try {
      const name = `Шаблон ${new Date().toLocaleString('ru-RU')}`;
      await apiRequest('/text-templates', {
        method: 'POST',
        body: JSON.stringify({ name, formatted_content: { text: html } }),
      });
      return { success: true, message: 'Шаблон сохранён' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsSavingTemplate(false));
    }
  }
);
