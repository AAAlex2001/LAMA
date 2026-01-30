'use client';

import PostSettings from '@/components/post-settings/post-settings';
import { useAppDispatch, useAppSelector } from '../store';
import { selectChannelsState, selectTagsState } from '../store/selectors';
import * as settingsSlice from '../store/slices/settings';
import { setTagInputValue, clearSearch, resetTags } from '../store/slices/tags';
import { toggleChannelSelected, deselectAllChannels } from '../store/slices/channels';
import { resetDatePicker } from '../store/slices/datePicker';
import { resetReplyToPost } from '../store/slices/replyToPost';
import { fetchTagsThunk, searchTagsThunk, deleteTagThunk, fetchChannelsThunk, addChannelThunk } from '../store/thunks';
import type { RepeatOption, RepeatCustomUnit, AutoDeleteOption, TagColor } from '../store/types';

interface PostSettingsConnectedProps {
  onPreview?: () => void;
  previewDisabled?: boolean;
}

export default function PostSettingsConnected({ onPreview, previewDisabled }: PostSettingsConnectedProps) {
  const dispatch = useAppDispatch();

  const selectedTagName = useAppSelector(state => state.settings.selectedTagName);
  const selectedTagColor = useAppSelector(state => state.settings.selectedTagColor);
  const notifySubscribers = useAppSelector(state => state.settings.notifySubscribers);
  const pinPost = useAppSelector(state => state.settings.pinPost);
  const showCreateChannel = useAppSelector(state => state.settings.showCreateChannel);
  const repeatInterval = useAppSelector(state => state.settings.repeatInterval);
  const repeatCustomDays = useAppSelector(state => state.settings.repeatCustomDays);
  const repeatCustomHours = useAppSelector(state => state.settings.repeatCustomHours);
  const repeatCustomUnit = useAppSelector(state => state.settings.repeatCustomUnit);
  const repeatCustomValue = useAppSelector(state => state.settings.repeatCustomValue);
  const repeatWeekdays = useAppSelector(state => state.settings.repeatWeekdays);
  const repeatMonthDays = useAppSelector(state => state.settings.repeatMonthDays);
  const repeatYearMonth = useAppSelector(state => state.settings.repeatYearMonth);
  const repeatYearDays = useAppSelector(state => state.settings.repeatYearDays);
  const repeatEndType = useAppSelector(state => state.settings.repeatEndType);
  const repeatEndDate = useAppSelector(state => state.settings.repeatEndDate);
  const autoDeleteInterval = useAppSelector(state => state.settings.autoDeleteInterval);
  const autoDeleteCustomDays = useAppSelector(state => state.settings.autoDeleteCustomDays);
  const autoDeleteCustomHours = useAppSelector(state => state.settings.autoDeleteCustomHours);

  const tagsState = useAppSelector(selectTagsState);

  const channelsState = useAppSelector(selectChannelsState);

  const selectedChannels = channelsState.channels.filter(c => c.selected);
  const selectedCount = selectedChannels.length;

  const channelOptions = channelsState.channels.map(ch => ({
    id: String(ch.id),
    label: ch.title,
    checked: ch.selected,
    members_count: ch.members_count,
    photo_url: ch.photo_url,
  }));

  const handleFetchChannels = () => {
    dispatch(fetchChannelsThunk({}));
  };

  const handleChannelChange = (id: string) => {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      dispatch(toggleChannelSelected(numericId));
    }
  };

  const handleAddChannel = async (link: string) => {
    try {
      const result = await dispatch(addChannelThunk(link)).unwrap();
      dispatch(settingsSlice.setShowCreateChannel(false));
      return true;
    } catch {
      return false;
    }
  };

  const handleSelectTag = (tag: { name: string; color: string }) => {
    dispatch(settingsSlice.selectTag({ ...tag, id: 0, created_at: '' }));
    dispatch(clearSearch());
  };

  const handleLoadRecentTags = () => {
    dispatch(fetchTagsThunk({}));
  };

  const handleSearchTags = (query: string) => {
    dispatch(searchTagsThunk(query));
  };

  const handleDeleteTag = (name: string) => {
    const tag = tagsState.recentTags.find(t => t.name === name);
    if (tag) {
      dispatch(deleteTagThunk(tag.id));
    }
  };

  return (
    <PostSettings
      onPreview={onPreview}
      previewDisabled={previewDisabled}
      channelOptions={channelOptions}
      channelsLoading={channelsState.loading}
      channelsSyncing={channelsState.syncing}
      selectedCount={selectedCount}
      totalChannels={channelsState.channels.length}
      showCreateChannel={showCreateChannel}
      onFetchChannels={handleFetchChannels}
      onChannelChange={handleChannelChange}
      onAddChannel={handleAddChannel}
      onOpenCreateChannel={() => dispatch(settingsSlice.setShowCreateChannel(true))}
      onCloseCreateChannel={() => dispatch(settingsSlice.setShowCreateChannel(false))}
      recentTags={tagsState.recentTags.map(tag => ({ ...tag, color: tag.color || '#808080' }))}
      searchResults={tagsState.searchResults.map(tag => ({ ...tag, color: tag.color || '#808080' }))}
      tagInputValue={tagsState.tagInputValue}
      selectedTagName={selectedTagName}
      selectedTagColor={selectedTagColor}
      tagsLoading={tagsState.loading}
      tagsSearching={tagsState.searching}
      onLoadRecentTags={handleLoadRecentTags}
      onSearchTags={handleSearchTags}
      onTagInputChange={(value: string) => dispatch(setTagInputValue(value))}
      onSelectTag={handleSelectTag}
      onDeleteTag={handleDeleteTag}
      onTagColorChange={(color: TagColor) => dispatch(settingsSlice.setSelectedTagColor(color))}
      repeatInterval={repeatInterval}
      repeatCustomDays={repeatCustomDays}
      repeatCustomHours={repeatCustomHours}
      repeatCustomUnit={repeatCustomUnit}
      repeatCustomValue={repeatCustomValue}
      repeatWeekdays={repeatWeekdays}
      repeatMonthDays={repeatMonthDays}
      repeatYearMonth={repeatYearMonth}
      repeatYearDays={repeatYearDays}
      repeatEndType={repeatEndType}
      repeatEndDate={repeatEndDate ? new Date(repeatEndDate) : null}
      onRepeatChange={(v: RepeatOption) => dispatch(settingsSlice.setRepeatInterval(v))}
      onRepeatCustomDaysChange={(v: number) => dispatch(settingsSlice.setRepeatCustomDays(v))}
      onRepeatCustomHoursChange={(v: number) => dispatch(settingsSlice.setRepeatCustomHours(v))}
      onRepeatCustomUnitChange={(v: RepeatCustomUnit) => dispatch(settingsSlice.setRepeatCustomUnit(v))}
      onRepeatCustomValueChange={(v: number) => dispatch(settingsSlice.setRepeatCustomValue(v))}
      onRepeatWeekdaysChange={(v: number[]) => dispatch(settingsSlice.setRepeatWeekdays(v))}
      onRepeatMonthDaysChange={(v: number[]) => dispatch(settingsSlice.setRepeatMonthDays(v))}
      onRepeatYearMonthChange={(v: number) => dispatch(settingsSlice.setRepeatYearMonth(v))}
      onRepeatYearDaysChange={(v: number[]) => dispatch(settingsSlice.setRepeatYearDays(v))}
      onRepeatEndTypeChange={(v: 'never' | 'date') => {
        dispatch(settingsSlice.setRepeatEndType(v));
        if (v === 'date' && !repeatEndDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dispatch(settingsSlice.setRepeatEndDate(today.toISOString()));
        }
      }}
      onRepeatEndDateChange={(v: Date | null) => dispatch(settingsSlice.setRepeatEndDate(v?.toISOString() ?? null))}
      autoDeleteInterval={autoDeleteInterval}
      autoDeleteCustomDays={autoDeleteCustomDays}
      autoDeleteCustomHours={autoDeleteCustomHours}
      onAutoDeleteChange={(v: AutoDeleteOption) => dispatch(settingsSlice.setAutoDeleteInterval(v))}
      onAutoDeleteCustomDaysChange={(v: number) => dispatch(settingsSlice.setAutoDeleteCustomDays(v))}
      onAutoDeleteCustomHoursChange={(v: number) => dispatch(settingsSlice.setAutoDeleteCustomHours(v))}
      notifySubscribers={notifySubscribers}
      pinPost={pinPost}
      onNotifyChange={(v: boolean) => dispatch(settingsSlice.setNotifySubscribers(v))}
      onPinChange={(v: boolean) => dispatch(settingsSlice.setPinPost(v))}
      onReset={() => { 
        dispatch(settingsSlice.resetSettings());
        dispatch(resetTags());
        dispatch(deselectAllChannels());
        dispatch(resetDatePicker());
        dispatch(resetReplyToPost());
      }}
    />
  );
}
