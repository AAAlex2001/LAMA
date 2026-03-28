import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { removeDraft } from '../slices/draftListSlice';

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
  },
);
