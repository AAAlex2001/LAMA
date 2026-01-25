'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { postsApi, type Post } from '@/stores/posts';

interface ReplyToPostContextValue {
  posts: Post[];
  isOpen: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedPostId: number | null;
  replyToPost: Post | null;
  selectedChannelId: number | null;
  
  filteredPosts: Post[];
  
  setSearchQuery: (query: string) => void;
  setSelectedChannelId: (id: number | null) => void;
  loadPosts: (channelId?: number | null) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  selectPost: (id: number | null) => void;
  setReplyToPost: (post: Post | null) => void;
  clearReplyToPost: () => void;
  getPost: (id: number) => Promise<Post>;
  
  open: (channelId?: number | null) => void;
  close: () => void;
  toggle: () => void;
}

const ReplyToPostContext = createContext<ReplyToPostContextValue | null>(null);

interface ReplyToPostProviderProps {
  children: ReactNode;
}

export function ReplyToPostProvider({ children }: ReplyToPostProviderProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [replyToPost, setReplyToPost] = useState<Post | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    
    // Поиск по дате в формате DD.MM.YY или DD.MM.YYYY
    const date = new Date(post.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const formattedDateFull = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    if (formattedDate.includes(searchQuery) || formattedDateFull.includes(searchQuery)) {
      return true;
    }
    
    // Поиск по тексту
    const text = post.text_content || '';
    const formattedText = post.formatted_content?.text || '';
    return text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           formattedText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadPosts = async (channelId?: number | null) => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const effectiveChannelId = channelId ?? selectedChannelId;
      const response = await postsApi.getPosts(1, 20, 'published', effectiveChannelId ?? undefined);
      setPosts(response.items);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await postsApi.getPosts(nextPage, 20, 'published', selectedChannelId ?? undefined);
      setPosts(prev => [...prev, ...response.items]);
      setCurrentPage(nextPage);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getPost = async (id: number): Promise<Post> => {
    return postsApi.getPost(id);
  };

  const selectPost = (id: number | null) => {
    setSelectedPostId(id);
  };

  const clearReplyToPost = () => {
    setReplyToPost(null);
  };

  const open = async (channelId?: number | null) => {
    setIsOpen(true);
    if (channelId !== undefined) {
      setSelectedChannelId(channelId);
    }
    await loadPosts(channelId);
  };
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedPostId(null);
    setCurrentPage(1);
    setHasMore(true);
  };
  
  const toggle = () => setIsOpen(prev => !prev);

  const value: ReplyToPostContextValue = {
    posts,
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    selectedPostId,
    replyToPost,
    selectedChannelId,
    filteredPosts,
    setSearchQuery,
    setSelectedChannelId,
    loadPosts,
    loadMorePosts,
    selectPost,
    setReplyToPost,
    clearReplyToPost,
    getPost,
    open,
    close,
    toggle,
  };

  return <ReplyToPostContext.Provider value={value}>{children}</ReplyToPostContext.Provider>;
}

export function useReplyToPost() {
  const context = useContext(ReplyToPostContext);
  if (!context) {
    throw new Error('useReplyToPost must be used within ReplyToPostProvider');
  }
  return context;
}
