'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import {
  formatTime,
  getPreviewText,
  getSourceDate,
  buildCreatePostUrl,
} from '../utils/calendar-helpers';
import styles from './calendar-sidebar.module.scss';

interface CalendarSidebarProps {
  selectedDate: Date;
  sidebarDate: Date;
  onSidebarDateChange: (date: Date) => void;
  posts: Draft[];
  onEdit: (post: Draft) => void;
  highlightedDates?: number[];
  postCounts?: Record<string, number>;
  onMonthChange?: (date: Date) => void;
}

export default function CalendarSidebar({
  selectedDate,
  sidebarDate,
  onSidebarDateChange,
  posts,
  onEdit,
  highlightedDates = [],
  postCounts,
  onMonthChange,
}: CalendarSidebarProps) {
  const router = useRouter();

  return (
    <div className={styles.sidebar}>
      <div className={styles.calendarWrapper}>
        <DatePicker
          value={sidebarDate}
          onChange={onSidebarDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          className={styles.calendar}
          postCounts={postCounts}
        />
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.createBtnWrapper}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            fullWidth
            className={styles.createBtn}
            onClick={() => router.push(buildCreatePostUrl(selectedDate))}
          />
        </div>

        {posts.length > 0 && (
          <div className={styles.postsSection}>
            <div className={styles.postsInner}>
              {posts.map((post) => {
                const time = formatTime(getSourceDate(post));
                const preview = getPreviewText(post);
                const isPublished = post.status === 'published';

                return (
                  <div
                    key={post.id}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
