'use client';

import { useEffect } from 'react';
import type { AppDispatch } from '../store';
import { fetchMoreDrafts } from '../store/thunks';

export function useDraftsInfiniteScroll(
  dispatch: AppDispatch,
  hasMore: boolean,
  isLoadingMore: boolean,
) {
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    function handleScroll() {
      if (!scrollContainer) return;
      const { scrollHeight, scrollTop, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !isLoadingMore) {
        dispatch(fetchMoreDrafts());
      }
    }
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [dispatch, hasMore, isLoadingMore]);
}
