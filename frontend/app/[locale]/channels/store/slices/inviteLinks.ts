import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InviteLink } from '@/types';

interface InviteLinksState {
  links: InviteLink[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: InviteLinksState = {
  links: [],
  loaded: false,
  loading: false,
  error: null,
};

const inviteLinksSlice = createSlice({
  name: 'inviteLinks',
  initialState,
  reducers: {
    setLinks(state, action: PayloadAction<InviteLink[]>) {
      state.links = action.payload;
      state.loaded = true;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setLinks,
  setLoading,
  setError,
} = inviteLinksSlice.actions;

export default inviteLinksSlice.reducer;
