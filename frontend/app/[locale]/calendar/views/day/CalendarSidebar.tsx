'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import type { Draft } from '@/types/post';
import { CalendarDocPostIcon, CalendarDraftIcon, CalendarRepeatIcon, CalendarBotMessageIcon } from '@/components/icons';
import {
  formatTime,
  getPreviewText,
  getSourceDate,
  buildCreatePostUrl,
  hasRepeat,
  isBeforeToday,
} from '../../utils/calendar-helpers';
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
  const isPast = isBeforeToday(selectedDate);

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
        {!isPast && (
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
        )}

        {posts.length > 0 && (
          <div className={styles.postsSection}>
            <div className={styles.postsInner}>
              {posts.map((post, index) => {
                const time = formatTime(getSourceDate(post));
                const preview = getPreviewText(post);
                const isPublished = post.status === 'published';

                return (
                  <div
                    key={`${post.id}-${getSourceDate(post)}-${index}`}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    {post.is_bot_message ? (
                      <CalendarBotMessageIcon width={14} height={14} />
                    ) : post.status === 'draft' ? (
                      <CalendarDraftIcon width={14} height={14} />
                    ) : (
                      <CalendarDocPostIcon width={16} height={16} />
                    )}
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                    {hasRepeat(post) && <CalendarRepeatIcon width={14} height={14} />}
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
