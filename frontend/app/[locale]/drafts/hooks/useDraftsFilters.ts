'use client';

import { useEffect, useRef, useState } from 'react';
import type { Tag } from '@/types';
import type { Draft } from '@/types/post';
import type { SortKey } from '../components/drafts-header/types';
import type { TagOption } from '../components/drafts-header/TagsCheckboxOptions';

const defaultSortByDate = 'Сначала новые';
const defaultSortByTags = 'По тегам';
const defaultSortBySource = 'По источнику';

export function useDraftsFilters() {
  const [sortByDate, setSortByDate] = useState(defaultSortByDate);
  const [sortBySource, setSortBySource] = useState(defaultSortBySource);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [openSort, setOpenSort] = useState<SortKey>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const sortBarRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSort && !mobileFilterOpen) return;
    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (sortBarRef.current?.contains(target) || mobileFilterRef.current?.contains(target)) return;
      setOpenSort(null);
      setMobileFilterOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openSort, mobileFilterOpen]);

  const sortOrder: 'asc' | 'desc' = sortByDate === 'Сначала старые' ? 'asc' : 'desc';

  return {
    sortByDate,
    setSortByDate,
    sortBySource,
    setSortBySource,
    selectedTagIds,
    setSelectedTagIds,
    sortOrder,
    openSort,
    setOpenSort,
    mobileFilterOpen,
    setMobileFilterOpen,
    sortBarRef,
    mobileFilterRef,
    isDateActive: sortByDate !== defaultSortByDate,
    isTagsActive: selectedTagIds.length > 0,
    isSourceActive: sortBySource !== defaultSortBySource,
    dateOptions: ['Сначала новые', 'Сначала старые'],
    sourceOptions: [defaultSortBySource, 'Все', 'Из парсера', 'Созданы мной'],
    defaultSortByDate,
    defaultSortBySource,
  };
}

export function getTagOptions(allTags: Tag[], drafts: Draft[]): TagOption[] {
  if (allTags.length > 0) return allTags.map((t) => ({ id: t.id, name: t.name }));

  const map = new Map<number, { id: number; name: string; latestAt: number }>();
  for (const draft of drafts) {
    const at = new Date(draft.updated_at || draft.created_at).getTime();
    for (const tag of draft.tags || []) {
      const existing = map.get(tag.id);
      if (!existing || at > existing.latestAt) {
        map.set(tag.id, { id: tag.id, name: tag.name, latestAt: at });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(({ id, name }) => ({ id, name }));
}

export function getTagButtonLabel(tagOptions: TagOption[], selectedIds: number[]): string {
  if (selectedIds.length === 0) return defaultSortByTags;
  if (selectedIds.length === 1) {
    return tagOptions.find((t) => t.id === selectedIds[0])?.name || defaultSortByTags;
  }
  return `${defaultSortByTags} (${selectedIds.length})`;
}
