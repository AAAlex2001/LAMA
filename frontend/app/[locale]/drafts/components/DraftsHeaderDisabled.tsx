'use client';

import { Button } from '@/components/new-button';
import { ChevronDownIcon, FilterSortIcon } from '@/components/icons';
import styles from '../drafts.module.scss';

export default function DraftsHeaderDisabled() {
  return (
    <div className={styles.header}>
      <div className={styles.sortBar}>
        <span className={styles.sortLabel}>Сортировка:</span>
        <div className={styles.sortGroup}>
          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={`${styles.sortButton} ${styles.sortButtonDisabled}`}
              disabled
            >
              <span className={styles.sortButtonText}>От новых к старым</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
            </button>
          </div>

          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={`${styles.sortButton} ${styles.sortButtonDisabled}`}
              disabled
            >
              <span className={styles.sortButtonText}>По тегам</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
            </button>
          </div>

          <div className={styles.sortDropdown}>
            <button
              type="button"
              className={`${styles.sortButton} ${styles.sortButtonDisabled}`}
              disabled
            >
              <span className={styles.sortButtonText}>По источнику</span>
              <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.headerCreateBtn}>
        <Button
          style={{ width: '100%' }}
          intent="gradient"
          className={styles.createButton}
          onClick={() => { window.location.href = '/drafts'; }}
        >
          Список черновиков
        </Button>
      </div>

      <div className={styles.mobileFilterWrapper}>
        <button
          type="button"
          className={styles.mobileFilterButton}
          disabled
        >
          <FilterSortIcon width={24} height={24} />
        </button>
      </div>
    </div>
  );
}
