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

    function shouldLoadMore(): boolean {
      if (!hasMore || isLoadingMore) return false;

      if (scrollContainer) {
        const { scrollHeight, scrollTop, clientHeight } = scrollContainer;
        return scrollHeight - scrollTop <= clientHeight + 120;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewport = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      return fullHeight - (scrollTop + viewport) <= 120;
    }

    function handleScroll() {
      if (shouldLoadMore()) {
        dispatch(fetchMoreDrafts());
      }
    }

    scrollContainer?.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once in case content does not fill viewport yet.
    handleScroll();

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [dispatch, hasMore, isLoadingMore]);
}
