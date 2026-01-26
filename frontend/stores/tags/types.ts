// Типы для работы с тегами

import type { TagColor } from '@/components/dropdown/types';

export interface Tag {
  id: number;
  name: string;
  created_at: string;
  color?: string;
}

export interface TagListResponse {
  items: Tag[];
  total: number;
}

export interface TagsState {
  recentTags: Tag[];     // Недавние/популярные теги из БД
  loading: boolean;
  searching: boolean;
  error: string | null;
  searchResults: Tag[];
  searchQuery: string;      // Поисковый запрос (поиск по существующим тегам)
  tagInputValue: string;    // Ввод названия нового тега
  selectedTagName: string;  // Выбранный тег для отображения в хедере
  selectedTagColor: TagColor;
}

export type TagsAction =
  | { type: 'SET_RECENT_TAGS'; payload: Tag[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_RESULTS'; payload: Tag[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_TAG_INPUT_VALUE'; payload: string }
  | { type: 'SET_SELECTED_TAG_NAME'; payload: string }
  | { type: 'SET_SELECTED_TAG_COLOR'; payload: TagColor }
  | { type: 'REMOVE_TAG'; payload: number }
  | { type: 'RESET' };

export const initialTagsState: TagsState = {
  recentTags: [],
  loading: false,
  searching: false,
  error: null,
  searchResults: [],
  searchQuery: '',
  tagInputValue: '',
  selectedTagName: '',
  selectedTagColor: '#FAC7C7',
};

export function tagsReducer(
  state: TagsState,
  action: TagsAction
): TagsState {
  switch (action.type) {
    case 'SET_RECENT_TAGS':
      return { ...state, recentTags: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SEARCHING':
      return { ...state, searching: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_TAG_INPUT_VALUE':
      return { ...state, tagInputValue: action.payload };
    case 'SET_SELECTED_TAG_NAME':
      console.log('🔄 Reducer SET_SELECTED_TAG_NAME:', action.payload);
      return { ...state, selectedTagName: action.payload };
    case 'SET_SELECTED_TAG_COLOR':
      console.log('🔄 Reducer SET_SELECTED_TAG_COLOR:', action.payload);
      return { ...state, selectedTagColor: action.payload };
    case 'REMOVE_TAG': {
      const deletedTag = state.recentTags.find(tag => tag.id === action.payload) || 
                         state.searchResults.find(tag => tag.id === action.payload);
      const shouldClearSelected = deletedTag && state.selectedTagName === deletedTag.name;
      
      return { 
        ...state, 
        recentTags: state.recentTags.filter(tag => tag.id !== action.payload),
        searchResults: state.searchResults.filter(tag => tag.id !== action.payload),
        selectedTagName: shouldClearSelected ? '' : state.selectedTagName,
      };
    }
    case 'RESET':
      // Сбрасываем только инпут и результаты поиска, но оставляем загруженные теги
      return {
        ...state,
        searchQuery: '',
        tagInputValue: '',
        selectedTagName: '',
        searchResults: [],
      };
    default:
      return state;
  }
}
