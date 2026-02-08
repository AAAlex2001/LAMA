'use client';

import type { RefObject } from 'react';
import Button from '@/components/button/button';
import { ChevronDownIcon, SortClearIcon, FilterSortIcon } from '@/components/icons';
import styles from '../drafts.module.scss';

type SortKey = 'date' | 'tags' | 'source' | null;

interface TagOption {
  id: number;
  name: string;
}

interface DraftsHeaderProps {
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

export default function DraftsHeader({
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
}: DraftsHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.sortBar} ref={sortBarRef}>
        <span className={styles.sortLabel}>Сортировка:</span>
        <div className={styles.sortGroup}>
          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={isDateActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
              onClick={() => setOpenSort(openSort === 'date' ? null : 'date')}
            >
              <span className={styles.sortButtonText}>{sortByDate}</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
              {isDateActive && (
                <span
                  className={styles.sortClear}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSortByDate(defaultSortByDate);
                  }}
                >
                  <SortClearIcon />
                </span>
              )}
            </button>
            {openSort === 'date' && (
              <div className={styles.sortMenu}>
                {dateOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSortByDate(option);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        option === sortByDate
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={isTagsActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
              onClick={() => setOpenSort(openSort === 'tags' ? null : 'tags')}
            >
              <span className={styles.sortButtonText}>{tagButtonLabel}</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
              {isTagsActive && (
                <span
                  className={styles.sortClear}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedTagIds([]);
                  }}
                >
                  <SortClearIcon />
                </span>
              )}
            </button>
            {openSort === 'tags' && (
              <div className={styles.sortMenuTags}>
                <div className={styles.sortMenuTagsList}>
                  <button
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSelectedTagIds([]);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        selectedTagIds.length === 0
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>По умолчанию</span>
                  </button>
                  {tagOptions.map((tag) => {
                    const isChecked = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={styles.sortOption}
                        onClick={() => {
                          setSelectedTagIds((prev) => {
                            if (prev.includes(tag.id)) {
                              return prev.filter((id) => id !== tag.id);
                            }
                            return [...prev, tag.id];
                          });
                        }}
                      >
                        <span
                          className={
                            isChecked
                              ? `${styles.sortCheckbox} ${styles.sortCheckboxActive}`
                              : styles.sortCheckbox
                          }
                        >
                          <span className={styles.sortCheckboxDot} />
                        </span>
                        <span className={styles.sortOptionText}>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={isSourceActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
              onClick={() => setOpenSort(openSort === 'source' ? null : 'source')}
            >
              <span className={styles.sortButtonText}>{sortBySource}</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
              {isSourceActive && (
                <span
                  className={styles.sortClear}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSortBySource(defaultSortBySource);
                  }}
                >
                  <SortClearIcon />
                </span>
              )}
            </button>
            {openSort === 'source' && (
              <div className={styles.sortMenu}>
                {sourceOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSortBySource(option);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        option === sortBySource
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.headerCreateBtn}>
        <Button
          text="Создать черновик"
          showArrow={false}
          fullWidth
          active
          className={styles.createButton}
          onClick={() => { window.location.href = 'create-post'; }}
        />
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
                {dateOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSortByDate(option);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        option === sortByDate
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>{option}</span>
                  </button>
                ))}
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
                <div className={styles.mobileFilterSubmenuList}>
                  <button
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSelectedTagIds([]);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        selectedTagIds.length === 0
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>По умолчанию</span>
                  </button>
                  {tagOptions.map((tag) => {
                    const isChecked = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={styles.sortOption}
                        onClick={() => {
                          setSelectedTagIds((prev) => {
                            if (prev.includes(tag.id)) {
                              return prev.filter((id) => id !== tag.id);
                            }
                            return [...prev, tag.id];
                          });
                        }}
                      >
                        <span
                          className={
                            isChecked
                              ? `${styles.sortCheckbox} ${styles.sortCheckboxActive}`
                              : styles.sortCheckbox
                          }
                        >
                          <span className={styles.sortCheckboxDot} />
                        </span>
                        <span className={styles.sortOptionText}>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
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
                {sourceOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={styles.sortOption}
                    onClick={() => {
                      setSortBySource(option);
                      setOpenSort(null);
                    }}
                  >
                    <span
                      className={
                        option === sortBySource
                          ? `${styles.sortRadio} ${styles.sortRadioActive}`
                          : styles.sortRadio
                      }
                    >
                      <span className={styles.sortRadioDot} />
                    </span>
                    <span className={styles.sortOptionText}>{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
