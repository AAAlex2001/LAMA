'use client';

import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getPreviewText(post: Draft): string {
  const html =
    post.formatted_content?.html ||
    post.formatted_content?.text ||
    post.text_content ||
    '';
  return html.replace(/<[^>]*>/g, '').trim();
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
            onClick={() => {
              const yyyy = selectedDate.getFullYear();
              const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const dd = String(selectedDate.getDate()).padStart(2, '0');
              window.location.href = `/create-post?date=${yyyy}-${mm}-${dd}`;
            }}
          />
        </div>

        {posts.length > 0 && (
          <div className={styles.postsSection}>
            <div className={styles.postsInner}>
              {posts.map((post) => {
                const time = formatTime(
                  post.status === 'scheduled'
                    ? ((post as any).scheduled_time || post.created_at)
                    : ((post as any).published_at || post.updated_at || post.created_at)
                );
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
