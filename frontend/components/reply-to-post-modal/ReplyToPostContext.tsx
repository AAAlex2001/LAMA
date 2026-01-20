'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { postsApi, type Post } from '@/stores/posts';

interface ReplyToPostContextValue {
  posts: Post[];
  isOpen: boolean;
  isLoading: boolean;
  searchQuery: string;
  selectedPostId: number | null;
  replyToPost: Post | null;
  
  filteredPosts: Post[];
  
  setSearchQuery: (query: string) => void;
  loadPosts: () => Promise<void>;
  selectPost: (id: number | null) => void;
  setReplyToPost: (post: Post | null) => void;
  clearReplyToPost: () => void;
  getPost: (id: number) => Promise<Post>;
  
  open: () => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [replyToPost, setReplyToPost] = useState<Post | null>(null);

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

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const response = await postsApi.getPosts();
      setPosts(response.items);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
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

  const open = async () => {
    setIsOpen(true);
    await loadPosts();
  };
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedPostId(null);
  };
  
  const toggle = () => setIsOpen(prev => !prev);

  const value: ReplyToPostContextValue = {
    posts,
    isOpen,
    isLoading,
    searchQuery,
    selectedPostId,
    replyToPost,
    filteredPosts,
    setSearchQuery,
    loadPosts,
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
