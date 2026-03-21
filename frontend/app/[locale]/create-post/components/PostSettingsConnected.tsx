'use client';

import PostSettings from '@/components/post-settings/post-settings';
import { useAppDispatch, useAppSelector } from '../store';
import { selectChannelsState } from '../store/selectors';
import * as settingsSlice from '../store/slices/settings';
import { resetTags } from '../store/slices/tags';
import { toggleChannelSelected, deselectAllChannels } from '../store/slices/channels';
import { resetDatePicker } from '../store/slices/datePicker';
import { resetReplyToPost } from '../store/slices/replyToPost';
import { fetchChannelsThunk } from '../store/thunks';
import type { RepeatOption, RepeatCustomUnit, AutoDeleteOption } from '../store/types';

interface PostSettingsConnectedProps {
  onPreview?: () => void;
  previewDisabled?: boolean;
}

export default function PostSettingsConnected({ onPreview, previewDisabled }: PostSettingsConnectedProps) {
  const dispatch = useAppDispatch();

  const datePickerState = useAppSelector(state => state.datePicker);
  const notifySubscribers = useAppSelector(state => state.settings.notifySubscribers);
  const pinPost = useAppSelector(state => state.settings.pinPost);
  const showCreateChannel = useAppSelector(state => state.settings.showCreateChannel);
  const repeatInterval = useAppSelector(state => state.settings.repeatInterval);
  const repeatPublishTimeType = useAppSelector(state => state.settings.repeatPublishTimeType);
  const repeatPublishHours = useAppSelector(state => state.settings.repeatPublishHours);
  const repeatPublishMinutes = useAppSelector(state => state.settings.repeatPublishMinutes);
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

  const handleChannelAdded = () => {
    dispatch(fetchChannelsThunk({ force: true }));
    dispatch(settingsSlice.setShowCreateChannel(false));
  };

  return (
    <PostSettings
      onPreview={onPreview}
      previewDisabled={previewDisabled}
      channelOptions={channelOptions}
      channelsLoading={channelsState.loading}
      selectedCount={selectedCount}
      totalChannels={channelsState.channels.length}
      showCreateChannel={showCreateChannel}
      onFetchChannels={handleFetchChannels}
      onChannelChange={handleChannelChange}
      onOpenCreateChannel={() => dispatch(settingsSlice.setShowCreateChannel(true))}
      onCloseCreateChannel={() => dispatch(settingsSlice.setShowCreateChannel(false))}
      onChannelAdded={handleChannelAdded}
      repeatInterval={repeatInterval}
      repeatPublishTimeType={repeatPublishTimeType}
      repeatPublishHours={repeatPublishHours}
      repeatPublishMinutes={repeatPublishMinutes}
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
      scheduledPostDate={datePickerState.selectedDate}
      onRepeatChange={(v: RepeatOption) => dispatch(settingsSlice.setRepeatInterval(v))}
      onRepeatPublishTimeTypeChange={(v: 'from_publish' | 'exact_time') => dispatch(settingsSlice.setRepeatPublishTimeType(v))}
      onRepeatPublishHoursChange={(v: number) => dispatch(settingsSlice.setRepeatPublishHours(v))}
      onRepeatPublishMinutesChange={(v: number) => dispatch(settingsSlice.setRepeatPublishMinutes(v))}
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
          const scheduledDate = datePickerState.selectedDate;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const minDate = scheduledDate && scheduledDate > today ? scheduledDate : today;
          dispatch(settingsSlice.setRepeatEndDate(minDate.toISOString()));
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
