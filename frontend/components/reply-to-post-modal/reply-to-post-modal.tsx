'use client';

import { useRef } from 'react';
import styles from './reply-to-post-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import { useReplyToPost } from './ReplyToPostContext';
import type { Post } from '@/stores/posts';

export default function ReplyToPostModal() {
  const {
    posts,
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    selectedPostId,
    filteredPosts,
    setSearchQuery,
    selectPost,
    setReplyToPost,
    getPost,
    loadMorePosts,
    close,
  } = useReplyToPost();

  const postsListRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    
    if (scrolledToBottom && hasMore && !isLoadingMore && !searchQuery) {
      loadMorePosts();
    }
  };

  const handlePostClick = async (post: Post) => {
    selectPost(post.id);
    try {
      const fullPost = await getPost(post.id);
      setReplyToPost(fullPost);
      close();
    } catch (error) {
      console.error('Failed to load full post:', error);
      setReplyToPost(post);
      close();
    }
  };

  const handleClose = () => {
    close();
  };

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

  if (!isOpen) return null;

  return (
    <div className={styles.replyModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Поиск по дате (DD.MM.YY) или тексту"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <h2 className={styles.modalTitle}>Название выбранного канала</h2>

        <div className={styles.postsList} ref={postsListRef} onScroll={handleScroll}>
          {isLoading || (posts.length === 0 && !searchQuery) ? (
            <div className={styles.emptyState}>
              <Loader size={24} color="blue" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'Посты не найдены' : 'У вас пока нет опубликованных постов'}
            </div>
          ) : (
            <>
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={styles.postItem}
                  onClick={() => handlePostClick(post)}
                >
                  <Checkbox
                    variant="radio"
                    checked={selectedPostId === post.id}
                    onChange={() => handlePostClick(post)}
                  />
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
