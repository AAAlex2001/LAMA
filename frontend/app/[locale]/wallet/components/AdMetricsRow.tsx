'use client';

import EyeIcon from '@/components/icons/eye-icon';
import styles from './AdMetricsRow.module.scss';

const COMMENT_ICON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1 2.5C1 1.67 1.67 1 2.5 1h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H4.5L2 11V8.5c-.55 0-1-.45-1-1V2.5z"
      stroke="#B0B4B8"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

const CLICK_ICON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 1v3M5 8v3M1 5h3M8 5h3M2.2 2.2l2.1 2.1M7.7 7.7l2.1 2.1M9.8 2.2L7.7 4.3M4.3 7.7L2.2 9.8"
      stroke="#B0B4B8"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

const LIKE_ICON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 10.5S1.5 7.5 1.5 4.5C1.5 3.12 2.62 2 4 2c.83 0 1.57.4 2 1.04C6.43 2.4 7.17 2 8 2c1.38 0 2.5 1.12 2.5 2.5C10.5 7.5 6 10.5 6 10.5z"
      stroke="#B0B4B8"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export interface AdMetrics {
  comments: string;
  views: string;
  clicks: string;
  reactions: string;
}

interface AdMetricsRowProps {
  metrics: AdMetrics;
}

export default function AdMetricsRow({ metrics }: AdMetricsRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.metric}>
        {COMMENT_ICON}
        {metrics.comments}
      </span>
      <span className={styles.metric}>
        <EyeIcon width={12} height={12} color="#B0B4B8" />
        {metrics.views}
      </span>
      <span className={styles.metric}>
        {CLICK_ICON}
        {metrics.clicks}
      </span>
      <span className={styles.metric}>
        {LIKE_ICON}
        {metrics.reactions}
      </span>
    </div>
  );
}
