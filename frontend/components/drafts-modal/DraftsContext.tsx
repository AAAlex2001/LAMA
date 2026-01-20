'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { draftsApi, type Draft } from '@/stores/drafts';

interface DraftsContextValue {
  // State
  drafts: Draft[];
  isOpen: boolean;
  isLoading: boolean;
  searchQuery: string;
  selectedDraftId: number | null;
  
  // Filtered
  filteredDrafts: Draft[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  loadDrafts: () => Promise<void>;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

  // Загружаем черновики при открытии
  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen]);

  // Фильтрация черновиков по поиску
  const filteredDrafts = drafts.filter(draft => {
    if (!searchQuery) return true;
    const text = draft.text_content || '';
    const formattedText = draft.formatted_content?.text || '';
    return text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           formattedText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await draftsApi.getDrafts();
      setDrafts(response.items);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDraft = async (id: number) => {
    // Сразу удаляем из UI
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }

    // Затем отправляем запрос на сервер
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
  const open = () => setIsOpen(true);
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedDraftId(null);
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
    searchQuery,
    selectedDraftId,
    filteredDrafts,
    setSearchQuery,
    loadDrafts,
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
