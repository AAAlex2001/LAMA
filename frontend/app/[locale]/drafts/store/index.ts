import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import draftsReducer from './slices/draftListSlice';

export const draftsStore = configureStore({
  reducer: {
    drafts: draftsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof draftsStore.getState>;
export type AppDispatch = typeof draftsStore.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export type { DraftListState } from './slices/draftListSlice';
export {
  setDrafts,
  appendDrafts,
  removeDraft,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setSearchQuery,
  setTagIdsFilter,
  setSelectedDraftId,
  setPage,
  setSortOrder,
  resetDrafts,
} from './slices/draftListSlice';
export { fetchDrafts, fetchMoreDrafts, deleteDraftThunk } from './thunks';
export {
  selectDraftItems,
  selectDraftsLoading,
  selectDraftsLoadingMore,
  selectDraftsHasMore,
  selectDraftsSortOrder,
  selectDraftsTagIdsFilter,
} from './selectors';
