'use client';

import Loader from '@/components/loader';
import Button from '@/components/button/button';
import CalendarCard from './CalendarCard';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import styles from '../calendar.module.scss';

interface CalendarListProps {
  posts: Draft[];
  isLoading: boolean;
  onEdit: (post: Draft) => void;
}

export default function CalendarList({
  posts,
  isLoading,
  onEdit,
}: CalendarListProps) {
  if (isLoading) {
    return (
      <div className={styles.loaderCentered}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyTextWrap}>
          <h3 className={styles.emptyTitle}>Нет публикаций на этот день</h3>
          <p className={styles.emptySubtitle}>Запланируйте или создайте публикацию</p>
        </div>
        <Button
          text="Создать публикацию"
          showArrow={false}
          active
          className={styles.emptyCreateBtn}
          onClick={() => { window.location.href = '/create-post'; }}
        />
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {posts.map(post => (
        <CalendarCard
          key={post.id}
          post={post}
          onEdit={() => onEdit(post)}
        />
      ))}
    </div>
  );
}
