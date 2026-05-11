'use client';

import styles from '../../drafts.module.scss';

export interface TagOption {
  id: number;
  name: string;
}

interface Props {
  options: TagOption[];
  selectedIds: number[];
  onClear: () => void;
  onToggle: (id: number) => void;
}

export default function TagsCheckboxOptions({ options, selectedIds, onClear, onToggle }: Props) {
  return (
    <div className={styles.sortMenuTagsList}>
      <button
        type="button"
        className={styles.sortOption}
        onClick={onClear}
      >
        <span
          className={
            selectedIds.length === 0
              ? `${styles.sortRadio} ${styles.sortRadioActive}`
              : styles.sortRadio
          }
        >
          <span className={styles.sortRadioDot} />
        </span>
        <span className={styles.sortOptionText}>По умолчанию</span>
      </button>
      {options.map((tag) => {
        const checked = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={styles.sortOption}
            onClick={() => onToggle(tag.id)}
          >
            <span
              className={
                checked
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
  );
}
