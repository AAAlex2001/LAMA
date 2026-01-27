'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { draftsApi, type Draft } from '@/stores/drafts';

interface DraftsContextValue {
  // State
  drafts: Draft[];
  isOpen: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedDraftId: number | null;
  
  // Filtered
  filteredDrafts: Draft[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  loadDrafts: () => Promise<void>;
  loadMoreDrafts: () => Promise<void>;
  deleteDraft: (id: number) => Promise<void>;
  selectDraft: (id: number | null) => void;
  getDraft: (id: number) => Promise<Draft>;
  
  // Toggle visibility
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const DraftsContext = createContext<DraftsContextValue | null>(null);

interface DraftsProviderProps {
  children: ReactNode;
}

export function DraftsProvider({ children }: DraftsProviderProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

  const filteredDrafts = drafts.filter(draft => {
    if (!searchQuery) return true;

    const date = new Date(draft.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const formattedDateFull = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    if (formattedDate.includes(searchQuery) || formattedDateFull.includes(searchQuery)) {
      return true;
    }

    const text = draft.text_content || '';
    const formattedText = draft.formatted_content?.text || '';
    return text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           formattedText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadDrafts = async () => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const response = await draftsApi.getDrafts(1, 20);
      setDrafts(response.items);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreDrafts = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await draftsApi.getDrafts(nextPage, 20);
      setDrafts(prev => [...prev, ...response.items]);
      setCurrentPage(nextPage);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load more drafts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const deleteDraft = async (id: number) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }

    try {
      await draftsApi.deleteDraft(id);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      // В случае ошибки перезагружаем список
      loadDrafts();
    }
  };

  const getDraft = async (id: number): Promise<Draft> => {
    return draftsApi.getDraft(id);
  };

  const selectDraft = (id: number | null) => {
    setSelectedDraftId(id);
  };

  // Toggle visibility
  const open = async () => {
    setIsOpen(true);
    await loadDrafts();
  };
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedDraftId(null);
    setCurrentPage(1);
    setHasMore(true);
  };
  
  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const value: DraftsContextValue = {
    drafts,
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    selectedDraftId,
    filteredDrafts,
    setSearchQuery,
    loadDrafts,
    loadMoreDrafts,
    deleteDraft,
    selectDraft,
    getDraft,
    open,
    close,
    toggle,
  };

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}

export function useDrafts() {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within DraftsProvider');
  }
  return context;
}
