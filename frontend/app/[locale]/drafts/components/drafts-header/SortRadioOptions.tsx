'use client';

import styles from '../../drafts.module.scss';

interface Props {
  options: string[];
  value: string;
  onSelect: (option: string) => void;
}

export default function SortRadioOptions({ options, value, onSelect }: Props) {
  return (
    <>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.sortOption}
          onClick={() => onSelect(option)}
        >
          <span className={option === value ? `${styles.sortRadio} ${styles.sortRadioActive}` : styles.sortRadio}>
            <span className={styles.sortRadioDot} />
          </span>
          <span className={styles.sortOptionText}>{option}</span>
        </button>
      ))}
    </>
  );
}
