// Типы для работы с тегами

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
  tagInputValue: string; // Введённое название тега (новое или выбранное)
}

export type TagsAction =
  | { type: 'SET_RECENT_TAGS'; payload: Tag[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_RESULTS'; payload: Tag[] }
  | { type: 'SET_TAG_INPUT_VALUE'; payload: string }
  | { type: 'REMOVE_TAG'; payload: number }
  | { type: 'RESET' };

export const initialTagsState: TagsState = {
  recentTags: [],
  loading: false,
  searching: false,
  error: null,
  searchResults: [],
  tagInputValue: '',
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
    case 'SET_TAG_INPUT_VALUE':
      return { ...state, tagInputValue: action.payload };
    case 'REMOVE_TAG':
      return { 
        ...state, 
        recentTags: state.recentTags.filter(tag => tag.id !== action.payload),
        searchResults: state.searchResults.filter(tag => tag.id !== action.payload),
      };
    case 'RESET':
      // Сбрасываем только инпут и результаты поиска, но оставляем загруженные теги
      return {
        ...state,
        tagInputValue: '',
        searchResults: [],
      };
    default:
      return state;
  }
}
