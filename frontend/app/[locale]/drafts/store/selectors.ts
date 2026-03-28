import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

const selectDraftsState = (state: RootState) => state.drafts;

export const selectDraftItems = createSelector(selectDraftsState, (s) => s.items);
export const selectDraftsLoading = createSelector(selectDraftsState, (s) => s.isLoading);
export const selectDraftsLoadingMore = createSelector(selectDraftsState, (s) => s.isLoadingMore);
export const selectDraftsHasMore = createSelector(selectDraftsState, (s) => s.hasMore);
export const selectDraftsSortOrder = createSelector(selectDraftsState, (s) => s.sortOrder);
export const selectDraftsTagIdsFilter = createSelector(selectDraftsState, (s) => s.tagIdsFilter);
