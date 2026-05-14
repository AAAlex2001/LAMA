import type { AppDispatch, RootState } from './index';
import * as channelsSelectionSlice from './slices/channelsSelection';
import * as settingsSlice from './slices/settings';
import type { PostSettings } from './types';

/**
 * Снять снимок настроек активного поста.
 *
 * Берём selectedIds из `channelsSelection` (источник правды для выбранных
 * каналов) + все per-post поля из `settings`. Кэш доступных каналов и
 * UI-флаги (channelsLoading, tagInputValue) общие — не трогаем.
 */
export function captureSnapshotSettings(state: RootState): PostSettings {
  const s = state.settings;
  return {
    selectedChannelIds: [...state.channelsSelection.selectedIds],
    notifySubscribers: s.notifySubscribers,
    pinPost: s.pinPost,
    selectedTags: s.selectedTags.map((t) => ({ ...t })),
    selectedTagColor: s.selectedTagColor,
    repeatInterval: s.repeatInterval,
    repeatPublishTimeType: s.repeatPublishTimeType,
    repeatPublishHours: s.repeatPublishHours,
    repeatPublishMinutes: s.repeatPublishMinutes,
    repeatCustomDays: s.repeatCustomDays,
    repeatCustomHours: s.repeatCustomHours,
    repeatCustomUnit: s.repeatCustomUnit,
    repeatCustomValue: s.repeatCustomValue,
    repeatWeekdays: [...s.repeatWeekdays],
    repeatMonthDays: [...s.repeatMonthDays],
    repeatYearMonth: s.repeatYearMonth,
    repeatYearDays: [...s.repeatYearDays],
    repeatEndType: s.repeatEndType,
    repeatEndDate: s.repeatEndDate,
    autoDeleteInterval: s.autoDeleteInterval,
    autoDeleteCustomDays: s.autoDeleteCustomDays,
    autoDeleteCustomHours: s.autoDeleteCustomHours,
    ad: { ...s.ad },
    replyToPostId: s.replyToPostId,
  };
}

/**
 * Залить настройки конкретного поста серии в глобальные слайсы.
 *
 * После вызова UI настроек (PostSettingsConnected, AdToggleSection, и т.д.)
 * отрисует значения именно этого поста, потому что все эти компоненты
 * читают из `settings` / `channelsSelection`.
 */
export function applySnapshotSettings(dispatch: AppDispatch, settings: PostSettings): void {
  dispatch(channelsSelectionSlice.setSelectedChannelIds(settings.selectedChannelIds));

  dispatch(settingsSlice.setNotifySubscribers(settings.notifySubscribers));
  dispatch(settingsSlice.setPinPost(settings.pinPost));
  dispatch(settingsSlice.setSelectedTagColor(settings.selectedTagColor));

  dispatch(settingsSlice.clearTags());
  for (const tag of settings.selectedTags) {
    dispatch(settingsSlice.addTag(tag));
    if (tag.id !== undefined) {
      dispatch(settingsSlice.updateSelectedTagId({ name: tag.name, id: tag.id }));
    }
  }

  dispatch(settingsSlice.setRepeatInterval(settings.repeatInterval));
  dispatch(settingsSlice.setRepeatPublishTimeType(settings.repeatPublishTimeType));
  dispatch(settingsSlice.setRepeatPublishHours(settings.repeatPublishHours));
  dispatch(settingsSlice.setRepeatPublishMinutes(settings.repeatPublishMinutes));
  dispatch(settingsSlice.setRepeatCustomDays(settings.repeatCustomDays));
  dispatch(settingsSlice.setRepeatCustomHours(settings.repeatCustomHours));
  dispatch(settingsSlice.setRepeatCustomUnit(settings.repeatCustomUnit));
  dispatch(settingsSlice.setRepeatCustomValue(settings.repeatCustomValue));
  dispatch(settingsSlice.setRepeatWeekdays(settings.repeatWeekdays));
  dispatch(settingsSlice.setRepeatMonthDays(settings.repeatMonthDays));
  dispatch(settingsSlice.setRepeatYearMonth(settings.repeatYearMonth));
  dispatch(settingsSlice.setRepeatYearDays(settings.repeatYearDays));
  dispatch(settingsSlice.setRepeatEndType(settings.repeatEndType));
  dispatch(settingsSlice.setRepeatEndDate(settings.repeatEndDate));

  dispatch(settingsSlice.setAutoDeleteInterval(settings.autoDeleteInterval));
  dispatch(settingsSlice.setAutoDeleteCustomDays(settings.autoDeleteCustomDays));
  dispatch(settingsSlice.setAutoDeleteCustomHours(settings.autoDeleteCustomHours));

  dispatch(settingsSlice.setAdSettings(settings.ad));
  dispatch(settingsSlice.setReplyToPostId(settings.replyToPostId));
}
