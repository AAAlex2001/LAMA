'use client';

import { useReducer, useCallback, useMemo } from 'react';
import {
  type ChannelsState,
  initialChannelsState,
  channelsReducer,
} from './types';
import { loadChannels, addChannel, removeChannel } from './actions';

export function useChannels() {
  const [state, dispatch] = useReducer(channelsReducer, initialChannelsState);

  // Загрузка каналов (вызывается при открытии дропдауна)
  const fetchChannelsList = useCallback(async () => {
    // Не загружаем повторно если уже загружены или загрузка идёт
    if (state.channels.length > 0 || state.loading) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const result = await loadChannels(state.page, state.pageSize);

    if (result.success && result.channels) {
      // Устанавливаем selected = true для всех каналов по умолчанию
      const channelsWithSelection = result.channels.map((ch) => ({
        ...ch,
        selected: true,
      }));
      dispatch({ type: 'SET_CHANNELS', payload: channelsWithSelection });
      dispatch({
        type: 'SET_PAGINATION',
        payload: {
          total: result.total || 0,
          page: state.page,
          pageSize: state.pageSize,
        },
      });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.message || 'Ошибка загрузки' });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, [state.page, state.pageSize, state.channels.length, state.loading]);

  // Добавить новый канал
  const handleAddChannel = useCallback(async (input: string): Promise<boolean> => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const result = await addChannel(input);

    if (result.success && result.channel) {
      const channelWithSelection = { ...result.channel, selected: true };
      dispatch({ type: 'ADD_CHANNEL', payload: channelWithSelection });
      dispatch({ type: 'SET_SYNCING', payload: false });
      return true;
    }

    dispatch({ type: 'SET_ERROR', payload: result.message || 'Ошибка' });
    dispatch({ type: 'SET_SYNCING', payload: false });
    return false;
  }, []);

  // Удалить канал
  const handleRemoveChannel = useCallback(async (channelId: number): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    const result = await removeChannel(channelId);

    if (result.success) {
      dispatch({ type: 'REMOVE_CHANNEL', payload: channelId });
      dispatch({ type: 'SET_LOADING', payload: false });
      return true;
    }

    dispatch({ type: 'SET_ERROR', payload: result.message || 'Ошибка' });
    dispatch({ type: 'SET_LOADING', payload: false });
    return false;
  }, []);

  // Переключить выбор канала
  const toggleChannelSelected = useCallback((channelId: number) => {
    dispatch({ type: 'TOGGLE_CHANNEL_SELECTED', payload: channelId });
  }, []);

  // Сбросить ошибку
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Выбранные каналы
  const selectedChannels = useMemo(
    () => state.channels.filter((ch) => ch.selected),
    [state.channels]
  );

  const selectedCount = selectedChannels.length;

  return {
    // State
    channels: state.channels,
    loading: state.loading,
    syncing: state.syncing,
    error: state.error,
    total: state.total,

    // Computed
    selectedChannels,
    selectedCount,

    // Actions
    fetchChannels: fetchChannelsList,
    addChannel: handleAddChannel,
    removeChannel: handleRemoveChannel,
    toggleChannelSelected,
    clearError,
  };
}

export type ChannelsStore = ReturnType<typeof useChannels>;
