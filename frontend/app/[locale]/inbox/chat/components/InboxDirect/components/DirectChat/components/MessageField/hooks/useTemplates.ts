'use client';

import { useState, useEffect } from 'react';
import type { TextTemplate, TextTemplateListResponse, UpdateTextTemplateRequest } from '@/app/[locale]/create-post/store/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
const PAGE_SIZE = 20;

function getAuthToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('lamaplanner_access_token')
    : null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Ошибка запроса');
  }
  
  return response.json();
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<TextTemplateListResponse>(
        `/publications/text-templates/?limit=${PAGE_SIZE}&skip=0`
      );
      setTemplates(response.items);
      setHasMore(response.items.length >= PAGE_SIZE);
      setPage(1);
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoreTemplates = async () => {
    if (isLoadingMore || !hasMore || searchQuery) return;
    
    setIsLoadingMore(true);
    try {
      const skip = page * PAGE_SIZE;
      const response = await apiRequest<TextTemplateListResponse>(
        `/publications/text-templates/?limit=${PAGE_SIZE}&skip=${skip}`
      );
      setTemplates(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newItems = response.items.filter(t => !existingIds.has(t.id));
        return [...prev, ...newItems];
      });
      setHasMore(response.items.length >= PAGE_SIZE);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const searchTemplates = async (query: string) => {
    setIsLoading(true);
    try {
      const url = `/publications/text-templates/?search=${encodeURIComponent(query)}&limit=${PAGE_SIZE}`;
      const response = await apiRequest<TextTemplateListResponse>(url);
      setTemplates(response.items);
      setHasMore(false);
    } catch (err) {
      console.error('Ошибка поиска:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (id: number, changes: UpdateTextTemplateRequest) => {
    try {
      await apiRequest(`/publications/text-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      setTemplates(prev => prev.map(t => 
        t.id === id ? { ...t, ...changes } : t
      ));
    } catch (err) {
      console.error('Ошибка обновления:', err);
      throw err;
    }
  };

  const deleteTemplate = async (id: number) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    try {
      await apiRequest(`/publications/text-templates/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        searchTemplates(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  return {
    templates,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    selectedTemplateId,
    setSearchQuery,
    setSelectedTemplateId,
    fetchMoreTemplates,
    updateTemplate,
    deleteTemplate,
  };
}
