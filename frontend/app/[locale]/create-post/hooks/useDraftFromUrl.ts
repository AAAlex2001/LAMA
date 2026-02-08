'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import { loadDraftById } from '../store/thunks';
import { setChannels as setChannelSelections } from '../store/slices/channels';

export function useDraftFromUrl() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const channels = useAppSelector((state) => state.channels.channels);
  const hasDraftParam = !!searchParams?.get('draft');
  const [draftChannelIds, setDraftChannelIds] = useState<number[] | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(hasDraftParam);
  const appliedRef = useRef(false);
  const loadedRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = searchParams?.get('draft');
    if (!raw) return;
    const draftId = Number(raw);
    if (!Number.isFinite(draftId) || draftId <= 0) return;
    if (loadedRef.current === draftId) return;
    loadedRef.current = draftId;
    setIsDraftLoading(true);

    dispatch(loadDraftById(draftId))
      .unwrap()
      .then((draft) => {
        const ids = (draft.channels || []).map((ch) => ch.id);
        setDraftChannelIds(ids);
        appliedRef.current = false;
      })
      .catch(() => {})
      .finally(() => {
        setIsDraftLoading(false);
      });
  }, [dispatch, searchParams]);

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

  return { isDraftLoading };
}
