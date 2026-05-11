'use client';

import { useRef } from 'react';
import styles from './reply-to-post-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import type { ReplyToPostModalProps, Post } from '@/types/post';

const getPostPreview = (post: Post): string => {
  const text = post.formatted_content?.text || post.text_content || '';
  const plainText = text.replace(/<[^>]*>/g, '');
  return plainText.length > 40 ? plainText.substring(0, 40) + '...' : plainText;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function ReplyToPostModal({
  isOpen,
  posts,
  isLoading,
  isLoadingMore,
  hasMore,
  searchQuery,
  selectedPostId,
  onSearchQueryChange,
  onLoadMore,
  onSelect,
  onClose,
}: ReplyToPostModalProps) {
  const postsListRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (scrolledToBottom && hasMore && !isLoadingMore && !searchQuery) {
      onLoadMore();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.replyModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Поиск по дате (DD.MM.YY) или тексту"
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
        </div>

        <h2 className={styles.modalTitle}>Название выбранного канала</h2>

        <div className={styles.postsList} ref={postsListRef} onScroll={handleScroll}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <Loader size={24} color="blue" />
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'Посты не найдены' : 'У вас еще нет опубликованных постов'}
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={styles.postItem}
                  onClick={() => onSelect(post)}
                >
                  <span className={styles.postTime}>{formatTime(post.created_at)}</span>
                  <span className={styles.postDate}>{formatDate(post.created_at)}</span>
                  <span className={styles.postText}>{getPostPreview(post)}</span>
                </div>
              ))}
              
              {isLoadingMore && (
                <div className={styles.loadingMore}>
                  <Loader size={20} color="blue" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
