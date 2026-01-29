'use client';

import DraftsModal from '@/components/drafts-modal/drafts-modal';
import { useAppDispatch, useAppSelector } from '../store';
import * as draftsSlice from '../store/slices/drafts';
import * as uiSlice from '../store/slices/ui';
import { loadDraftIntoStore, fetchMoreDrafts, deleteDraftThunk } from '../store/thunks';
import type { Draft } from '../store/types';

export default function DraftsModalConnected() {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.ui.showDraftsModal);
  const draftsState = useAppSelector(state => state.drafts);

  return (
    <DraftsModal
      isOpen={isOpen}
      drafts={draftsState.items}
      isLoading={draftsState.isLoading}
      isLoadingMore={draftsState.isLoadingMore}
      hasMore={draftsState.hasMore}
      searchQuery={draftsState.searchQuery}
      selectedDraftId={draftsState.selectedDraftId}
      onSearchQueryChange={(q) => dispatch(draftsSlice.setSearchQuery(q))}
      onLoadMore={() => dispatch(fetchMoreDrafts())}
      onDelete={(id) => dispatch(deleteDraftThunk(id))}
      onSelect={(draft: Draft) => {
        loadDraftIntoStore(draft, dispatch);
        dispatch(uiSlice.setShowDraftsModal(false));
      }}
      onClose={() => dispatch(uiSlice.setShowDraftsModal(false))}
    />
  );
}
