'use client';

import { ChevronDownIcon } from '@/components/icons';
import SortRadioOptions from './SortRadioOptions';
import TagsCheckboxOptions, { type TagOption } from './TagsCheckboxOptions';
import type { SortKey } from './types';
import styles from '../../drafts.module.scss';

interface Props {
  openSort: SortKey;
  setOpenSort: (value: SortKey) => void;
  sortByDate: string;
  setSortByDate: (value: string) => void;
  sortBySource: string;
  setSortBySource: (value: string) => void;
  selectedTagIds: number[];
  setSelectedTagIds: (value: number[] | ((prev: number[]) => number[])) => void;
  dateOptions: string[];
  sourceOptions: string[];
  tagOptions: TagOption[];
  tagButtonLabel: string;
}

export default function MobileFilters({
  openSort,
  setOpenSort,
  sortByDate,
  setSortByDate,
  sortBySource,
  setSortBySource,
  selectedTagIds,
  setSelectedTagIds,
  dateOptions,
  sourceOptions,
  tagOptions,
  tagButtonLabel,
}: Props) {
  return (
    <div className={styles.mobileFilterPopup}>
      <button
        type="button"
        className={styles.mobileFilterItem}
        onClick={() => setOpenSort(openSort === 'date' ? null : 'date')}
      >
        <span className={styles.mobileFilterItemText}>{sortByDate}</span>
        <ChevronDownIcon width={16} height={16} />
      </button>
      {openSort === 'date' && (
        <div className={styles.mobileFilterSubmenu}>
          <SortRadioOptions
            options={dateOptions}
            value={sortByDate}
            onSelect={(option) => { setSortByDate(option); setOpenSort(null); }}
          />
        </div>
      )}

      <button
        type="button"
        className={styles.mobileFilterItem}
        onClick={() => setOpenSort(openSort === 'tags' ? null : 'tags')}
      >
        <span className={styles.mobileFilterItemText}>{tagButtonLabel}</span>
        <ChevronDownIcon width={16} height={16} />
      </button>
      {openSort === 'tags' && (
        <div className={`${styles.mobileFilterSubmenu} ${styles.mobileFilterSubmenuTags}`}>
          <TagsCheckboxOptions
            options={tagOptions}
            selectedIds={selectedTagIds}
            onClear={() => { setSelectedTagIds([]); setOpenSort(null); }}
            onToggle={(id) => setSelectedTagIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )}
          />
        </div>
      )}

      <button
        type="button"
        className={styles.mobileFilterItem}
        onClick={() => setOpenSort(openSort === 'source' ? null : 'source')}
      >
        <span className={styles.mobileFilterItemText}>{sortBySource}</span>
        <ChevronDownIcon width={16} height={16} />
      </button>
      {openSort === 'source' && (
        <div className={styles.mobileFilterSubmenu}>
          <SortRadioOptions
            options={sourceOptions}
            value={sortBySource}
            onSelect={(option) => { setSortBySource(option); setOpenSort(null); }}
          />
        </div>
      )}
    </div>
  );
}
