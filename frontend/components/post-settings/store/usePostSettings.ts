'use client';

import { useReducer, useCallback, useMemo } from 'react';
import { useChannels } from '@/stores/channels';
import { useTags } from '@/stores/tags';
import {
  type ChannelOption,
  type PostSettingsData,
  type RepeatOption,
  type AutoDeleteOption,
  initialPostSettingsState,
  postSettingsReducer,
} from './types';

export function usePostSettings() {
  const [state, dispatch] = useReducer(postSettingsReducer, initialPostSettingsState);

  // Подключаем store каналов
  const {
    channels,
    loading: channelsLoading,
    syncing: channelsSyncing,
    selectedCount,
    fetchChannels,
    addChannel,
    toggleChannelSelected,
  } = useChannels();

  // Подключаем store тегов
  const tagsStore = useTags();

  // Преобразуем каналы в формат для Dropdown
  const channelOptions: ChannelOption[] = useMemo(
    () =>
      channels.map((ch) => ({
        id: String(ch.id),
        label: ch.title,
        checked: ch.selected,
      })),
    [channels]
  );

  // Получить текущие настройки для отправки
  const getSettingsData = useCallback((): PostSettingsData => {
    const selectedChannelIds = channels
      .filter((ch) => ch.selected)
      .map((ch) => ch.id);

    return {
      channelIds: selectedChannelIds,
      notifySubscribers: state.notifySubscribers,
      pinPost: state.pinPost,
      tagName: tagsStore.tagInputValue.trim() || null,
      repeatInterval: state.repeatInterval,
      autoDeleteInterval: state.autoDeleteInterval,
      autoDeleteCustomDays: state.autoDeleteCustomDays,
      autoDeleteCustomHours: state.autoDeleteCustomHours,
    };
  }, [channels, state.notifySubscribers, state.pinPost, state.repeatInterval, state.autoDeleteInterval, state.autoDeleteCustomDays, state.autoDeleteCustomHours, tagsStore.tagInputValue]);

  // Обработчик изменения канала
  const handleChannelChange = useCallback(
    (id: string, checked: boolean) => {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        toggleChannelSelected(numericId);
      }
    },
    [toggleChannelSelected]
  );

  // Добавить канал
  const handleAddChannel = useCallback(
    async (channelLink: string): Promise<boolean> => {
      const success = await addChannel(channelLink);
      if (success) {
        dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: false });
      }
      return success;
    },
    [addChannel]
  );

  // Открыть/закрыть модалку добавления канала
  const openCreateChannel = useCallback(() => {
    dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: true });
  }, []);

  const closeCreateChannel = useCallback(() => {
    dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: false });
  }, []);

  // Toggle уведомления
  const handleNotifyChange = useCallback((checked: boolean) => {
    dispatch({ type: 'SET_NOTIFY_SUBSCRIBERS', payload: checked });
  }, []);

  // Toggle закрепления
  const handlePinChange = useCallback((checked: boolean) => {
    dispatch({ type: 'SET_PIN_POST', payload: checked });
  }, []);

  const handleRepeatChange = useCallback((value: RepeatOption) => {
    dispatch({ type: 'SET_REPEAT_INTERVAL', payload: value });
  }, []);

  const handleAutoDeleteChange = useCallback((value: AutoDeleteOption) => {
    dispatch({ type: 'SET_AUTO_DELETE_INTERVAL', payload: value });
  }, []);

  const handleAutoDeleteCustomDaysChange = useCallback((value: number) => {
    dispatch({ type: 'SET_AUTO_DELETE_CUSTOM_DAYS', payload: value });
  }, []);

  const handleAutoDeleteCustomHoursChange = useCallback((value: number) => {
    dispatch({ type: 'SET_AUTO_DELETE_CUSTOM_HOURS', payload: value });
  }, []);

  // Сброс настроек
  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET' });
    tagsStore.reset();
  }, [tagsStore]);

  return {
    // State
    notifySubscribers: state.notifySubscribers,
    pinPost: state.pinPost,
    showCreateChannel: state.showCreateChannel,
    repeatInterval: state.repeatInterval,
    autoDeleteInterval: state.autoDeleteInterval,
    autoDeleteCustomDays: state.autoDeleteCustomDays,
    autoDeleteCustomHours: state.autoDeleteCustomHours,

    // Channels
    channelOptions,
    channelsLoading,
    channelsSyncing,
    selectedCount,
    totalChannels: channels.length,

    // Tags (проброс из tags store)
    recentTags: tagsStore.recentTags,
    tagsLoading: tagsStore.loading,
    tagsSearching: tagsStore.searching,
    searchResults: tagsStore.searchResults,
    tagInputValue: tagsStore.tagInputValue,
    loadRecentTags: tagsStore.loadRecentTags,
    searchTags: tagsStore.searchTags,
    setTagInputValue: tagsStore.setTagInputValue,
    selectTag: tagsStore.selectTag,
    clearSearch: tagsStore.clearSearch,

    // Actions
    fetchChannels,
    handleChannelChange,
    handleAddChannel,
    openCreateChannel,
    closeCreateChannel,
    handleNotifyChange,
    handlePinChange,
    handleRepeatChange,
    handleAutoDeleteChange,
    handleAutoDeleteCustomDaysChange,
    handleAutoDeleteCustomHoursChange,
    resetSettings,
    getSettingsData,
  };
}

export type PostSettingsStore = ReturnType<typeof usePostSettings>;
