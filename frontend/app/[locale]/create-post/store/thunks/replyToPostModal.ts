import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Post, PostListResponse } from '../types';
import { apiRequest } from './api';
import {
  setPosts,
  appendPosts,
  setIsLoading,
  setIsLoadingMore,
  setHasMore,
  setPage,
  setSelectedPost,
  setSelectedPostId,
} from '../slices/replyToPost';

const PAGE_SIZE = 20;

export const fetchPosts = createAsyncThunk(
  'replyToPost/fetchPosts',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const response = await apiRequest<PostListResponse>(
        `/publications?channel_id=${channelId}&status=published&page=1&page_size=${PAGE_SIZE}`
      );
      dispatch(setPosts(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(1));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки постов');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchMorePosts = createAsyncThunk(
  'replyToPost/fetchMorePosts',
  async (channelId: number, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { page, isLoadingMore, hasMore } = state.replyToPost;
    
    if (isLoadingMore || !hasMore) return;
    
    dispatch(setIsLoadingMore(true));
    try {
      const nextPage = page + 1;
      const response = await apiRequest<PostListResponse>(
        `/publications?channel_id=${channelId}&status=published&page=${nextPage}&page_size=${PAGE_SIZE}`
      );
      dispatch(appendPosts(response.items));
      dispatch(setHasMore(response.items.length >= PAGE_SIZE));
      dispatch(setPage(nextPage));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoadingMore(false));
    }
  }
);

export const getPostById = createAsyncThunk(
  'replyToPost/getPostById',
  async (postId: number, { dispatch, rejectWithValue }) => {
    try {
      const post = await apiRequest<Post>(`/publications/${postId}`);
      dispatch(setSelectedPost(post));
      dispatch(setSelectedPostId(postId));
      return post;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки поста');
    }
  }
);

export const searchPosts = createAsyncThunk(
  'replyToPost/searchPosts',
  async ({ channelId, query }: { channelId: number; query: string }, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const url = `/publications?channel_id=${channelId}&status=published&search=${encodeURIComponent(query)}&page=1&page_size=${PAGE_SIZE}`;
      const response = await apiRequest<PostListResponse>(url);
      dispatch(setPosts(response.items));
      dispatch(setHasMore(false));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);
