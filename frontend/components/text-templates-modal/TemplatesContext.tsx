'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { templatesApi, type TextTemplate, type CreateTextTemplateRequest, type UpdateTextTemplateRequest } from '@/stores/templates';

interface TemplatesContextValue {
  // State
  templates: TextTemplate[];
  isOpen: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isSaving: boolean;
  searchQuery: string;
  selectedTemplateId: number | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  loadTemplates: () => Promise<void>;
  loadMoreTemplates: () => Promise<void>;
  createTemplate: (data: CreateTextTemplateRequest) => Promise<TextTemplate>;
  updateTemplate: (id: number, data: UpdateTextTemplateRequest) => Promise<TextTemplate>;
  deleteTemplate: (id: number) => Promise<void>;
  selectTemplate: (id: number | null) => void;
  
  // Toggle visibility
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

interface TemplatesProviderProps {
  children: ReactNode;
}

export function TemplatesProvider({ children }: TemplatesProviderProps) {
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const response = await templatesApi.getTemplates(1, 20, searchQuery || undefined);
      setTemplates(response.items);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreTemplates = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await templatesApi.getTemplates(nextPage, 20, searchQuery || undefined);
      setTemplates(prev => [...prev, ...response.items]);
      setCurrentPage(nextPage);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load more templates:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const createTemplate = async (data: CreateTextTemplateRequest): Promise<TextTemplate> => {
    setIsSaving(true);
    try {
      const template = await templatesApi.createTemplate(data);
      setTemplates(prev => [template, ...prev]);
      return template;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    // Сразу удаляем из UI
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }

    // Затем отправляем запрос на сервер
    try {
      await templatesApi.deleteTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      // В случае ошибки перезагружаем список
      loadTemplates();
    }
  };

  const updateTemplate = async (
    id: number,
    data: UpdateTextTemplateRequest
  ): Promise<TextTemplate> => {
    const updated = await templatesApi.updateTemplate(id, data);
    setTemplates(prev => prev.map(t => (t.id === id ? updated : t)));
    return updated;
  };

  const selectTemplate = (id: number | null) => {
    setSelectedTemplateId(id);
  };

  // Toggle visibility
  const open = async () => {
    setIsOpen(true);
    await loadTemplates();
  };
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedTemplateId(null);
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

  const value: TemplatesContextValue = {
    templates,
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    isSaving,
    searchQuery,
    selectedTemplateId,
    setSearchQuery,
    loadTemplates,
    loadMoreTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    selectTemplate,
    open,
    close,
    toggle,
  };

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>;
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error('useTemplates must be used within TemplatesProvider');
  }
  return context;
}
