import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Post } from '../types';

interface ReplyToPostState {
  items: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedPostId: number | null;
  selectedPost: Post | null;
  page: number;
}

const initialState: ReplyToPostState = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  searchQuery: '',
  selectedPostId: null,
  selectedPost: null,
  page: 1,
};

const replyToPostSlice = createSlice({
  name: 'replyToPost',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.items = action.payload;
    },
    appendPosts: (state, action: PayloadAction<Post[]>) => {
      const existingIds = new Set(state.items.map(p => p.id));
      const newItems = action.payload.filter(p => !existingIds.has(p.id));
      state.items = [...state.items, ...newItems];
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedPostId: (state, action: PayloadAction<number | null>) => {
      state.selectedPostId = action.payload;
    },
    setSelectedPost: (state, action: PayloadAction<Post | null>) => {
      state.selectedPost = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    resetReplyToPost: () => initialState,
  },
});

export const {
  setPosts,
  appendPosts,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setSearchQuery,
  setSelectedPostId,
  setSelectedPost,
  setPage,
  resetReplyToPost,
} = replyToPostSlice.actions;

export default replyToPostSlice.reducer;
