'use client';

import type { ReactNode } from 'react';
import styles from '../edit-post.module.scss';
import type { SeriesPostInfo } from '../hooks/useEditPostLoader';
import { formatDate, formatTime } from '../utils/formatters';

interface SeriesPostEditorProps {
  seriesPosts: SeriesPostInfo[];
  expandedPostId: number | null;
  onExpandPost: (id: number) => Promise<void>;
  dateTimeInputs: ReactNode;
  editorContent: ReactNode;
  footer: ReactNode;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronExpanded : ''}`}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="#000000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SeriesPostEditor({
  seriesPosts,
  expandedPostId,
  onExpandPost,
  dateTimeInputs,
  editorContent,
  footer,
}: SeriesPostEditorProps) {
  return (
    <div className={styles.editor}>
      <h2 className={styles.seriesTitle}>Редактирование поста</h2>

      {seriesPosts.map((sp, idx) => {
        const isExpanded = expandedPostId === sp.id;
        const isPublished = sp.status === 'published' || sp.status === 'partial_success';
        return (
          <div
            key={sp.id}
            className={`${styles.seriesPostTab} ${isExpanded ? styles.seriesPostTabExpanded : ''} ${isPublished ? styles.seriesPostTabDisabled : ''}`}
            onClick={!isExpanded && !isPublished ? () => onExpandPost(sp.id) : undefined}
          >
            <div className={styles.seriesPostHeader}>
              <span className={styles.seriesPostName}>Пост {idx + 1}</span>
              {isPublished && (
                <span className={styles.seriesPostPublished}>Опубликован</span>
              )}
              {!isExpanded && !isPublished && (
                <div className={styles.seriesPostMeta}>
                  <span className={styles.seriesPostDate}>{formatDate(sp.scheduled_time)}</span>
                  <span className={styles.seriesPostTime}>{formatTime(sp.scheduled_time)}</span>
                </div>
              )}
              {!isPublished && <ChevronIcon expanded={isExpanded} />}
            </div>

            {isExpanded && !isPublished && (
              <div className={styles.seriesPostContent}>
                {dateTimeInputs}
                {editorContent}
              </div>
            )}
          </div>
        );
      })}

      {footer}
    </div>
  );
}
