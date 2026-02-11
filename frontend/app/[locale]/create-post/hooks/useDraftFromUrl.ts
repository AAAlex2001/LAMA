'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import { loadDraftById, loadDraftByToken } from '../store/thunks';
import { setChannels as setChannelSelections } from '../store/slices/channels';

export function useDraftFromUrl() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const channels = useAppSelector((state) => state.channels.channels);
  const draftParam = searchParams?.get('draft');
  const tokenParam = searchParams?.get('token');
  const hasDraftParam = !!draftParam || !!tokenParam;
  const [draftChannelIds, setDraftChannelIds] = useState<number[] | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(hasDraftParam);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [loadedViaShareToken, setLoadedViaShareToken] = useState(false);
  const appliedRef = useRef(false);
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
        .then((draft) => {
          const ids = (draft.channels || []).map((ch) => ch.id);
          setDraftChannelIds(ids);
          appliedRef.current = false;
          setLoadedViaShareToken(true);
        })
        .catch((err) => {
          setDraftLoadError(typeof err === 'string' ? err : 'Ссылка недействительна, истекла или уже была использована');
          setLoadedViaShareToken(false);
        })
        .finally(() => {
          setIsDraftLoading(false);
        });
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
        .then((draft) => {
          const ids = (draft.channels || []).map((ch) => ch.id);
          setDraftChannelIds(ids);
          appliedRef.current = false;
        })
        .catch((err) => {
          setDraftLoadError(typeof err === 'string' ? err : 'Ошибка загрузки черновика');
        })
        .finally(() => {
          setIsDraftLoading(false);
        });
    } else {
      setDraftLoadError(null);
      setLoadedViaShareToken(false);
    }
  }, [dispatch, searchParams, tokenParam, draftParam]);

  useEffect(() => {
    if (!draftChannelIds) return;
    if (channels.length === 0) return;
    if (appliedRef.current) return;

    const channelIds = new Set(draftChannelIds);
    const next = channels.map((ch) => ({
      ...ch,
      selected: channelIds.size > 0 ? channelIds.has(ch.id) : false,
    }));
    dispatch(setChannelSelections(next));
    appliedRef.current = true;
  }, [channels, dispatch, draftChannelIds]);

  return { isDraftLoading, draftLoadError, loadedViaShareToken };
}

