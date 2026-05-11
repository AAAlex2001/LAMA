'use client';

import { useChannelsQuery } from '@/store/channels';
import type { ChannelBasic } from '@/types';
import { useAppSelector } from '../store';

/** Список выбранных каналов: TQ-данные ∩ локальная selection. */
export function useSelectedChannels(): ChannelBasic[] {
  const { data } = useChannelsQuery();
  const selectedIds = useAppSelector((s) => s.channelsSelection.selectedIds);
  if (!data?.items || selectedIds.length === 0) return [];
  const set = new Set(selectedIds);
  return data.items.filter((ch) => set.has(ch.id));
}
