'use client';

import { useReducer } from 'react';
import {
  type Tag,
  initialTagsState,
  tagsReducer,
} from './types';
import { TAG_COLORS, type TagColor } from '@/components/dropdown/types';
import { fetchTags, searchTags, deleteTag } from './api';

export function useTags() {
  const [state, dispatch] = useReducer(tagsReducer, initialTagsState);

  const normalizeTagColor = (color?: string): TagColor => {
    if (color && TAG_COLORS.includes(color as TagColor)) {
      return color as TagColor;
    }
    return '#FAC7C7';
  };

  // Загрузка тегов (недавние/популярные)
  const loadRecentTags = async () => {
    if (state.recentTags.length > 0 || state.loading) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetchTags();
      dispatch({ type: 'SET_RECENT_TAGS', payload: response.items });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Ошибка загрузки' });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  };

  // Поиск тегов
  const handleSearchTags = async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }
    
    dispatch({ type: 'SET_SEARCHING', payload: true });

    try {
      const response = await searchTags(query);
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: response.items });
    } catch (error) {
      console.error('Search error:', error);
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    }

    dispatch({ type: 'SET_SEARCHING', payload: false });
  };

  // Установить поисковый запрос
  const setSearchQuery = (value: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
    // Очистить результаты поиска если значение пустое
    if (!value.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    }
  };

  // Выбрать тег из списка
  const selectTag = (tag: Tag) => {
    console.log('🎯 selectTag вызван:', tag);
    dispatch({ type: 'SET_SELECTED_TAG_NAME', payload: tag.name });
    dispatch({ type: 'SET_SELECTED_TAG_COLOR', payload: normalizeTagColor(tag.color) });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    console.log('✅ selectTag завершен, имя:', tag.name, 'цвет:', tag.color || '#FAC7C7');
  };

  // Очистить результаты поиска
  const clearSearch = () => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
  };

  // Удалить тег
  const handleDeleteTag = async (tagId: number) => {
    try {
      await deleteTag(tagId);
      // Удаляем тег из локального состояния
      dispatch({ type: 'REMOVE_TAG', payload: tagId });
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  // Сброс состояния
  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  return {
    // State
    recentTags: state.recentTags,
    loading: state.loading,
    searching: state.searching,
    error: state.error,
    searchResults: state.searchResults,
    searchQuery: state.searchQuery,
    tagInputValue: state.tagInputValue,
    selectedTagName: state.selectedTagName,
    selectedTagColor: state.selectedTagColor,

    // Actions
    loadRecentTags,
    searchTags: handleSearchTags,
    setSearchQuery,
    setTagInputValue: (value: string) => dispatch({ type: 'SET_TAG_INPUT_VALUE', payload: value }),
    selectTag,
    setSelectedTagName: (name: string) => dispatch({ type: 'SET_SELECTED_TAG_NAME', payload: name }),
    setSelectedTagColor: (color: TagColor) => dispatch({ type: 'SET_SELECTED_TAG_COLOR', payload: color }),
    clearSearch,
    deleteTag: handleDeleteTag,
    reset,
  };
}

export type TagsStore = ReturnType<typeof useTags>;
