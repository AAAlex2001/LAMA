'use client';

import type { RefObject } from 'react';
import { Button } from '@/components/new-button';
import { FilterSortIcon } from '@/components/icons';
import SortDropdown from './SortDropdown';
import SortRadioOptions from './SortRadioOptions';
import TagsCheckboxOptions, { type TagOption } from './TagsCheckboxOptions';
import MobileFilters from './MobileFilters';
import type { SortKey } from './types';
import styles from '../../drafts.module.scss';

interface Props {
  sortBarRef: RefObject<HTMLDivElement | null>;
  mobileFilterRef: RefObject<HTMLDivElement | null>;
  openSort: SortKey;
  setOpenSort: (value: SortKey) => void;
  sortByDate: string;
  setSortByDate: (value: string) => void;
  sortBySource: string;
  setSortBySource: (value: string) => void;
  selectedTagIds: number[];
  setSelectedTagIds: (value: number[] | ((prev: number[]) => number[])) => void;
  mobileFilterOpen: boolean;
  setMobileFilterOpen: (value: boolean) => void;
  dateOptions: string[];
  sourceOptions: string[];
  tagOptions: TagOption[];
  tagButtonLabel: string;
  isDateActive: boolean;
  isTagsActive: boolean;
  isSourceActive: boolean;
  defaultSortByDate: string;
  defaultSortBySource: string;
}

export default function DraftsHeader(props: Props) {
  const {
    sortBarRef,
    mobileFilterRef,
    openSort,
    setOpenSort,
    sortByDate,
    setSortByDate,
    sortBySource,
    setSortBySource,
    selectedTagIds,
    setSelectedTagIds,
    mobileFilterOpen,
    setMobileFilterOpen,
    dateOptions,
    sourceOptions,
    tagOptions,
    tagButtonLabel,
    isDateActive,
    isTagsActive,
    isSourceActive,
    defaultSortByDate,
    defaultSortBySource,
  } = props;

  const toggle = (key: NonNullable<SortKey>) => () => setOpenSort(openSort === key ? null : key);

  const toggleTagId = (id: number) => setSelectedTagIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
  );

  return (
    <div className={styles.header}>
      <div className={styles.sortBar} ref={sortBarRef}>
        <span className={styles.sortLabel}>Сортировка:</span>
        <div className={styles.sortGroup}>
          <SortDropdown
            label={sortByDate}
            isOpen={openSort === 'date'}
            onToggle={toggle('date')}
            active={isDateActive}
            onClear={() => setSortByDate(defaultSortByDate)}
          >
            <SortRadioOptions
              options={dateOptions}
              value={sortByDate}
              onSelect={(option) => { setSortByDate(option); setOpenSort(null); }}
            />
          </SortDropdown>

          <SortDropdown
            label={tagButtonLabel}
            isOpen={openSort === 'tags'}
            onToggle={toggle('tags')}
            active={isTagsActive}
            onClear={() => setSelectedTagIds([])}
            menuClassName={styles.sortMenuTags}
          >
            <TagsCheckboxOptions
              options={tagOptions}
              selectedIds={selectedTagIds}
              onClear={() => { setSelectedTagIds([]); setOpenSort(null); }}
              onToggle={toggleTagId}
            />
          </SortDropdown>

          <SortDropdown
            label={sortBySource}
            isOpen={openSort === 'source'}
            onToggle={toggle('source')}
            active={isSourceActive}
            onClear={() => setSortBySource(defaultSortBySource)}
          >
            <SortRadioOptions
              options={sourceOptions}
              value={sortBySource}
              onSelect={(option) => { setSortBySource(option); setOpenSort(null); }}
            />
          </SortDropdown>
        </div>
      </div>

      <div className={styles.headerCreateBtn}>
        <Button
          style={{ width: '100%' }}
          intent="gradient"
          className={styles.createButton}
          onClick={() => { window.location.href = 'create-draft'; }}
        >
          Создать черновик
        </Button>
      </div>

      <div className={styles.mobileFilterWrapper} ref={mobileFilterRef}>
        <button
          type="button"
          className={styles.mobileFilterButton}
          onClick={() => {
            const nextOpen = !mobileFilterOpen;
            setMobileFilterOpen(nextOpen);
            if (!nextOpen) setOpenSort(null);
          }}
        >
          <FilterSortIcon width={24} height={24} />
        </button>
        {mobileFilterOpen && (
          <MobileFilters
            openSort={openSort}
            setOpenSort={setOpenSort}
            sortByDate={sortByDate}
            setSortByDate={setSortByDate}
            sortBySource={sortBySource}
            setSortBySource={setSortBySource}
            selectedTagIds={selectedTagIds}
            setSelectedTagIds={setSelectedTagIds}
            dateOptions={dateOptions}
            sourceOptions={sourceOptions}
            tagOptions={tagOptions}
            tagButtonLabel={tagButtonLabel}
          />
        )}
      </div>
    </div>
  );
}
