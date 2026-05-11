import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import type { Draft } from '../types';
import type { DraftListResponse } from '@/types/post';
import { apiRequest, API_BASE_URL } from '@/store/api';
import { loadChannelsList } from '@/store/channels/queries';
import {
  loadDraftIntoStore,
  applySeriesToStore,
  applyDraftSettingsToStore,
  applyDraftChannelSelection,
} from '../applyDraft';

async function fetchSeriesMembers(seriesId: number): Promise<Draft[]> {
  const qs = new URLSearchParams({
    status: 'draft',
    series_id: String(seriesId),
    page_size: '200',
    sort_order: 'asc',
    date_mode: 'updated',
  });
  const list = await apiRequest<DraftListResponse>(`/publications?${qs}`);
  return list.items;
}

export const loadDraftById = createAsyncThunk(
  'createPost/loadDraftById',
  async (draftId: number, { dispatch, rejectWithValue }) => {
    try {
      const draft = await apiRequest<Draft>(`/publications/${draftId}`);
      const dispatcher = dispatch as AppDispatch;

      if (draft.series_id) {
        const members = await fetchSeriesMembers(draft.series_id);
        if (members.length >= 2) {
          applySeriesToStore(members, draftId, dispatcher);
        } else {
          loadDraftIntoStore(draft, dispatcher);
        }
      } else {
        loadDraftIntoStore(draft, dispatcher);
      }

      applyDraftSettingsToStore(draft, dispatcher);
      const channels = await loadChannelsList();
      applyDraftChannelSelection(draft, channels, dispatcher);

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
    }
  },
);

export const loadDraftByToken = createAsyncThunk(
  'createPost/loadDraftByToken',
  async (token: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/publications/shared/${token}`);
      if (response.status === 404) {
        return rejectWithValue('Ссылка недействительна, истекла или уже была использована');
      }
      if (!response.ok) {
        return rejectWithValue('Не удалось загрузить черновик по ссылке');
      }
      const draft = (await response.json()) as Draft;
      const dispatcher = dispatch as AppDispatch;

      loadDraftIntoStore(draft, dispatcher);
      const channels = await loadChannelsList();
      applyDraftChannelSelection(draft, channels, dispatcher);

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
    }
  },
);
