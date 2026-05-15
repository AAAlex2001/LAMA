'use client';

import {
  CalendarCommentsIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
  ClickIcon,
} from '@/components/icons';
import styles from './AdMetricsRow.module.scss';

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
        <CalendarCommentsIcon width={12} height={12} color="#B0B4B8" />
        {metrics.comments}
      </span>
      <span className={styles.metric}>
        <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
        {metrics.views}
      </span>
      <span className={styles.metric}>
        <ClickIcon width={12} height={12} color="#B0B4B8" />
        {metrics.clicks}
      </span>
      <span className={styles.metric}>
        <CalendarReactionsIcon width={12} height={12} color="#B0B4B8" />
        {metrics.reactions}
      </span>
    </div>
  );
}
