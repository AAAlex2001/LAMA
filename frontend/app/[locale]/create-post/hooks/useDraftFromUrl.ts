'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch } from '../store';
import { loadDraftById, loadDraftByToken } from '../store/thunks';

export function useDraftFromUrl() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const draftParam = searchParams?.get('draft');
  const tokenParam = searchParams?.get('token');
  const hasDraftParam = !!draftParam || !!tokenParam;
  const [isDraftLoading, setIsDraftLoading] = useState(hasDraftParam);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [loadedViaShareToken, setLoadedViaShareToken] = useState(false);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      if (loadedRef.current === tokenParam) return;
      loadedRef.current = tokenParam;
      setIsDraftLoading(true);
      setDraftLoadError(null);
      setLoadedViaShareToken(false);

      dispatch(loadDraftByToken(tokenParam))
        .unwrap()
        .then(() => setLoadedViaShareToken(true))
        .catch((err) => {
          setDraftLoadError(typeof err === 'string' ? err : 'Ссылка недействительна, истекла или уже была использована');
        })
        .finally(() => setIsDraftLoading(false));
    } else if (draftParam) {
      const draftId = Number(draftParam);
      if (!Number.isFinite(draftId) || draftId <= 0) return;
      const key = `draft-${draftId}`;
      if (loadedRef.current === key) return;
      loadedRef.current = key;
      setIsDraftLoading(true);
      setDraftLoadError(null);
      setLoadedViaShareToken(false);

      dispatch(loadDraftById(draftId))
        .unwrap()
        .catch((err) => {
          setDraftLoadError(typeof err === 'string' ? err : 'Ошибка загрузки черновика');
        })
        .finally(() => setIsDraftLoading(false));
    } else {
      setDraftLoadError(null);
      setLoadedViaShareToken(false);
    }
  }, [dispatch, searchParams, tokenParam, draftParam]);

  return { isDraftLoading, draftLoadError, loadedViaShareToken };
}
