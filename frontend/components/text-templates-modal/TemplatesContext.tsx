'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { templatesApi, type TextTemplate, type CreateTextTemplateRequest } from '@/stores/templates';

interface TemplatesContextValue {
  // State
  templates: TextTemplate[];
  isOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  searchQuery: string;
  selectedTemplateId: number | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  loadTemplates: () => Promise<void>;
  createTemplate: (data: CreateTextTemplateRequest) => Promise<TextTemplate>;
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
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Загружаем шаблоны при открытии или изменении поиска
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, searchQuery]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await templatesApi.getTemplates(searchQuery || undefined);
      setTemplates(response.items);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
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

  const selectTemplate = (id: number | null) => {
    setSelectedTemplateId(id);
  };

  // Toggle visibility
  const open = () => setIsOpen(true);
  
  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedTemplateId(null);
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
    isSaving,
    searchQuery,
    selectedTemplateId,
    setSearchQuery,
    loadTemplates,
    createTemplate,
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
