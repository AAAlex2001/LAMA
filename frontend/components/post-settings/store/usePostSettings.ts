'use client';

import { useReducer } from 'react';
import { useChannels } from '@/stores/channels';
import { useTags } from '@/stores/tags';
import {
  type ChannelOption,
  type PostSettingsData,
  type RepeatOption,
  type AutoDeleteOption,
  type TagColor,
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
  const channelOptions: ChannelOption[] = channels.map((ch) => ({
    id: String(ch.id),
    label: ch.title,
    checked: ch.selected,
    members_count: ch.members_count,
    photo_url: ch.photo_url,
  }));

  // Получить текущие настройки для отправки
  const getSettingsData = (): PostSettingsData => {
    const selectedChannelIds = channels
      .filter((ch) => ch.selected)
      .map((ch) => ch.id);

    // tagInputValue - это название нового тега (ввод), selectedTagName - выбранный из списка
    // Приоритет: если введен новый тег - используем его, иначе выбранный
    const tagName = tagsStore.tagInputValue?.trim() || tagsStore.selectedTagName?.trim() || null;

    console.log('🏷️ Получение настроек тега:', {
      tagInputValue: tagsStore.tagInputValue,
      selectedTagName: tagsStore.selectedTagName,
      resultTagName: tagName,
      selectedTagColor: tagsStore.selectedTagColor,
    });

    return {
      channelIds: selectedChannelIds,
      notifySubscribers: state.notifySubscribers,
      pinPost: state.pinPost,
      tagName: tagName,
      tagColor: tagName ? tagsStore.selectedTagColor : null,
      repeatInterval: state.repeatInterval,
      repeatCustomDays: state.repeatCustomDays,
      repeatCustomHours: state.repeatCustomHours,
      repeatEndType: state.repeatEndType,
      repeatEndDate: state.repeatEndDate,
      autoDeleteInterval: state.autoDeleteInterval,
      autoDeleteCustomDays: state.autoDeleteCustomDays,
      autoDeleteCustomHours: state.autoDeleteCustomHours,
    };
  };

  // Обработчик изменения канала
  const handleChannelChange = (id: string, checked: boolean) => {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      toggleChannelSelected(numericId);
    }
  };

  // Добавить канал
  const handleAddChannel = async (channelLink: string): Promise<boolean> => {
    const success = await addChannel(channelLink);
    if (success) {
      dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: false });
    }
    return success;
  };

  // Открыть/закрыть модалку добавления канала
  const openCreateChannel = () => {
    dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: true });
  };

  const closeCreateChannel = () => {
    dispatch({ type: 'SET_SHOW_CREATE_CHANNEL', payload: false });
  };

  // Toggle уведомления
  const handleNotifyChange = (checked: boolean) => {
    dispatch({ type: 'SET_NOTIFY_SUBSCRIBERS', payload: checked });
  };

  // Toggle закрепления
  const handlePinChange = (checked: boolean) => {
    dispatch({ type: 'SET_PIN_POST', payload: checked });
  };

  const handleRepeatChange = (value: RepeatOption) => {
    dispatch({ type: 'SET_REPEAT_INTERVAL', payload: value });
  };

  const handleRepeatCustomDaysChange = (value: number) => {
    dispatch({ type: 'SET_REPEAT_CUSTOM_DAYS', payload: value });
  };

  const handleRepeatCustomHoursChange = (value: number) => {
    dispatch({ type: 'SET_REPEAT_CUSTOM_HOURS', payload: value });
  };

  const handleRepeatEndTypeChange = (value: 'never' | 'date') => {
    dispatch({ type: 'SET_REPEAT_END_TYPE', payload: value });
    if (value === 'never') {
      dispatch({ type: 'SET_REPEAT_END_DATE', payload: null });
    }
  };

  const handleRepeatEndDateChange = (value: Date | null) => {
    dispatch({ type: 'SET_REPEAT_END_DATE', payload: value });
  };

  const handleAutoDeleteChange = (value: AutoDeleteOption) => {
    dispatch({ type: 'SET_AUTO_DELETE_INTERVAL', payload: value });
  };

  const handleAutoDeleteCustomDaysChange = (value: number) => {
    dispatch({ type: 'SET_AUTO_DELETE_CUSTOM_DAYS', payload: value });
  };

  const handleAutoDeleteCustomHoursChange = (value: number) => {
    dispatch({ type: 'SET_AUTO_DELETE_CUSTOM_HOURS', payload: value });
  };

  const handleTagColorChange = (color: TagColor) => {
    tagsStore.setSelectedTagColor(color);
  };

  // Сброс настроек
  const resetSettings = () => {
    dispatch({ type: 'RESET' });
    // Сбрасываем только инпут тега и результаты поиска
    tagsStore.reset();
  };

  return {
    // State
    notifySubscribers: state.notifySubscribers,
    pinPost: state.pinPost,
    showCreateChannel: state.showCreateChannel,
    repeatInterval: state.repeatInterval,
    repeatCustomDays: state.repeatCustomDays,
    repeatCustomHours: state.repeatCustomHours,
    repeatEndType: state.repeatEndType,
    repeatEndDate: state.repeatEndDate,
    autoDeleteInterval: state.autoDeleteInterval,
    autoDeleteCustomDays: state.autoDeleteCustomDays,
    autoDeleteCustomHours: state.autoDeleteCustomHours,
    selectedTagColor: tagsStore.selectedTagColor,

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
      searchQuery: tagsStore.searchQuery,
      tagInputValue: tagsStore.tagInputValue,
      selectedTagName: tagsStore.selectedTagName,
      loadRecentTags: tagsStore.loadRecentTags,
      searchTags: tagsStore.searchTags,
      setSearchQuery: tagsStore.setSearchQuery,
      setTagInputValue: tagsStore.setTagInputValue,
      setSelectedTagName: tagsStore.setSelectedTagName,
      selectTag: tagsStore.selectTag,
      deleteTag: tagsStore.deleteTag,
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
    handleRepeatCustomDaysChange,
    handleRepeatCustomHoursChange,
    handleRepeatEndTypeChange,
    handleRepeatEndDateChange,
    handleAutoDeleteChange,
    handleAutoDeleteCustomDaysChange,
    handleAutoDeleteCustomHoursChange,
    handleTagColorChange,
    resetSettings,
    getSettingsData,
  };
}

export type PostSettingsStore = ReturnType<typeof usePostSettings>;
