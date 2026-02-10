import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from './index';

const selectChannelsSlice = (state: RootState) => state.channels;
const selectTagsSlice = (state: RootState) => state.tags;

export const selectSelectedChannels = createSelector(
  (state: RootState) => state.channels.channels,
  (channels) => channels.filter((c) => c.selected)
);

export const selectTagsState = createSelector(selectTagsSlice, (tags) => ({
  recentTags: tags.recentTags,
  searchResults: tags.searchResults,
  tagInputValue: tags.tagInputValue,
  loading: tags.loading,
  loadingMore: tags.loadingMore,
  searching: tags.searching,
  hasMore: tags.hasMore,
  page: tags.page,
  total: tags.total,
}));

export const selectChannelsState = createSelector(selectChannelsSlice, (channels) => ({
  channels: channels.channels,
  loading: channels.loading,
  syncing: channels.syncing,
  error: channels.error,
}));
