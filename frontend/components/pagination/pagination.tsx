'use client';

import { useId } from 'react';
import styles from './pagination.module.scss';

type Props = {
  onPrev: () => void;
  onNext: () => void;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
};

export default function Pagination({
  onPrev,
  onNext,
  className,
  prevLabel = 'Предыдущий',
  nextLabel = 'Следующий',
}: Props) {
  const baseId = useId();
  const leftId = `${baseId}-left`;
  const rightId = `${baseId}-right`;

  return (
    <div className={`${styles.navigation} ${className || ''}`.trim()}>
      <button className={styles.navButton} aria-label={prevLabel} onClick={onPrev} type="button">
        <svg
          width="16"
          height="14"
          viewBox="0 0 16 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: 'rotate(180deg)' }}
        >
          <path
            d="M15 7L9 13M15 7L9 1M15 7H1"
            stroke={`url(#${leftId})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id={leftId} x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#2F67C3" />
              <stop offset="0.75" stopColor="#295AAA" />
              <stop offset="0.875" stopColor="#26539D" />
              <stop offset="0.9375" stopColor="#244F96" />
              <stop offset="1" stopColor="#234C90" />
            </linearGradient>
          </defs>
        </svg>
      </button>

      <button className={styles.navButton} aria-label={nextLabel} onClick={onNext} type="button">
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 7L9 13M15 7L9 1M15 7H1"
            stroke={`url(#${rightId})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id={rightId} x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#2F67C3" />
              <stop offset="0.75" stopColor="#295AAA" />
              <stop offset="0.875" stopColor="#26539D" />
              <stop offset="0.9375" stopColor="#244F96" />
              <stop offset="1" stopColor="#234C90" />
            </linearGradient>
          </defs>
        </svg>
      </button>
    </div>
  );
}
