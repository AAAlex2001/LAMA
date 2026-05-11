'use client';

import React from 'react';
import Loader from '@/components/loader';
import { Button } from '@/components/new-button';
import CalendarCard from '../../shared/CalendarCard';
import type { Draft } from '@/types/post';
import styles from '../../calendar.module.scss';

interface CalendarListProps {
  posts: Draft[];
  isLoading: boolean;
  showInlineLoader?: boolean;
  onEdit: (post: Draft) => void;
  onAddPost?: () => void;
}

export default function CalendarList({
  posts,
  isLoading,
  showInlineLoader = false,
  onEdit,
  onAddPost,
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
          intent="gradient"
          className={styles.emptyCreateBtn}
          onClick={onAddPost ?? (() => { window.location.href = '/create-post'; })}
        >
          Создать публикацию
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {posts.map((post, index) => (
        <CalendarCard
          key={`${post.id}-${index}`}
          post={post}
          onEdit={() => onEdit(post)}
        />
      ))}
      {showInlineLoader && (
        <div className={styles.loaderWrapper}>
          <Loader size={20} color="blue" />
        </div>
      )}
    </div>
  );
}
