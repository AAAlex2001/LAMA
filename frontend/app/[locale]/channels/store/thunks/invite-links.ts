import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { setLinks, setLoading, setError } from '../slices/inviteLinks';
import type { InviteLink } from '@/types';

export const fetchInviteLinksThunk = createAsyncThunk(
  'inviteLinks/fetch',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    try {
      const result = await apiRequest<{ items: InviteLink[]; total: number }>(
        `/channels/${channelId}/invite-links`,
        { method: 'GET' },
      );
      dispatch(setLinks(result.items || []));
      return result.items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки ссылок';
      dispatch(setError(msg));
      dispatch(setLinks([]));
      return rejectWithValue(msg);
    } finally {
      dispatch(setLoading(false));
    }
  },
);
