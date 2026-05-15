import type { AppDispatch } from './index';
import type { Draft, PostSnapshot, RepeatOption, RepeatCustomUnit } from './types';
import type { ChannelBasic, TagColor } from '@/types';
import { TAG_COLORS } from '@/types';
import { setText, setShowLinkPreview } from './slices/editor';
import { setFiles, clearFiles, updateFile } from './slices/media';
import { setRows, openInlineButtons, resetInlineButtons } from './slices/inlineButtons';
import { setMode, setQuestion, setAnswers, setCorrectAnswer, openQuiz, resetQuiz } from './slices/quiz';
import { setSelectedChannelIds } from './slices/channelsSelection';
import {
  addTag,
  clearTags,
  setRepeatInterval,
  setRepeatCustomDays,
  setRepeatCustomHours,
  setRepeatCustomUnit,
  setRepeatCustomValue,
  setRepeatWeekdays,
  setRepeatMonthDays,
  setRepeatYearMonth,
  setRepeatYearDays,
  setRepeatEndType,
  setRepeatEndDate,
  setNotifySubscribers,
  setPinPost,
} from './slices/settings';
import { setSnapshots, setActiveIndex, resetSeries } from './slices/series';
import { draftToPostSnapshot } from '../utils/draftToPostSnapshot';

async function fetchContentLength(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const length = head.headers.get('content-length');
    if (length) return Number(length);
  } catch {
  }
  try {
    const range = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    const contentRange = range.headers.get('content-range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      if (total) return Number(total);
    }
    const length = range.headers.get('content-length');
    if (length) return Number(length);
  } catch {
  }
  return null;
}

export function applyPostSnapshotToStore(snapshot: PostSnapshot, dispatch: AppDispatch) {
  dispatch(setText(snapshot.text));
  dispatch(setShowLinkPreview(snapshot.showLinkPreview));

  if (snapshot.mediaFiles.length > 0) {
    dispatch(setFiles(snapshot.mediaFiles));

    const docsToMeasure = snapshot.mediaFiles.filter((m) => m.type === 'document' && !m.size && m.url);
    if (docsToMeasure.length > 0) {
      void Promise.all(
        docsToMeasure.map(async (doc) => {
          const size = await fetchContentLength(doc.url as string);
          if (size) dispatch(updateFile({ id: doc.id, updates: { size } }));
        }),
      );
    }
  } else {
    dispatch(clearFiles());
  }

  if (snapshot.inlineButtonsOpen && snapshot.buttonRows.length > 0) {
    dispatch(setRows(snapshot.buttonRows));
    dispatch(openInlineButtons());
  } else {
    dispatch(resetInlineButtons());
  }

  if (snapshot.quizOpen) {
    dispatch(setQuestion(snapshot.quizQuestion));
    dispatch(setAnswers(snapshot.quizAnswers));
    dispatch(setMode(snapshot.quizMode));
    if (snapshot.quizCorrectAnswerId) dispatch(setCorrectAnswer(snapshot.quizCorrectAnswerId));
    dispatch(openQuiz());
  } else {
    dispatch(resetQuiz());
  }

  if (snapshot.selectedTags !== undefined) {
    dispatch(clearTags());
    for (const tag of snapshot.selectedTags) {
      const color = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
        ? (tag.color as TagColor)
        : '#FAC7C7';
      dispatch(addTag({ name: tag.name, color }));
    }
  }
}

export function applyDraftSettingsToStore(draft: Draft, dispatch: AppDispatch) {
  const ri = draft.repeat_interval as RepeatOption | undefined;
  if (ri) dispatch(setRepeatInterval(ri));
  if (draft.repeat_custom_days != null) dispatch(setRepeatCustomDays(draft.repeat_custom_days));
  if (draft.repeat_custom_hours != null) dispatch(setRepeatCustomHours(draft.repeat_custom_hours));
  if (draft.repeat_custom_unit) dispatch(setRepeatCustomUnit(draft.repeat_custom_unit as RepeatCustomUnit));
  if (draft.repeat_custom_value != null) dispatch(setRepeatCustomValue(draft.repeat_custom_value));
  if (draft.repeat_weekdays) dispatch(setRepeatWeekdays(draft.repeat_weekdays));
  if (draft.repeat_month_days) dispatch(setRepeatMonthDays(draft.repeat_month_days));
  if (draft.repeat_year_month != null) dispatch(setRepeatYearMonth(draft.repeat_year_month));
  if (draft.repeat_year_days) dispatch(setRepeatYearDays(draft.repeat_year_days));
  if (draft.repeat_end_time) {
    dispatch(setRepeatEndType('date'));
    dispatch(setRepeatEndDate(draft.repeat_end_time));
  } else {
    dispatch(setRepeatEndType('never'));
  }
  if (draft.disable_notification != null) dispatch(setNotifySubscribers(!draft.disable_notification));
  if (draft.pin_message != null) dispatch(setPinPost(draft.pin_message));
}

export function loadDraftIntoStore(draft: Draft, dispatch: AppDispatch) {
  dispatch(resetSeries());
  const snap = draftToPostSnapshot(draft);
  dispatch(setSnapshots([snap]));
  dispatch(setActiveIndex(0));
  applyPostSnapshotToStore(snap, dispatch);
}

export function applySeriesToStore(members: Draft[], activeDraftId: number, dispatch: AppDispatch) {
  const sorted = [...members].sort((a, b) => {
    const ao = a.series_order ?? a.id;
    const bo = b.series_order ?? b.id;
    return ao - bo;
  });
  const snapshots = sorted.map(draftToPostSnapshot);
  const activeIndex = Math.max(0, sorted.findIndex((d) => d.id === activeDraftId));
  dispatch(setSnapshots(snapshots));
  dispatch(setActiveIndex(activeIndex));
  applyPostSnapshotToStore(snapshots[activeIndex], dispatch);
}

export function applyDraftChannelSelection(draft: Draft, channels: ChannelBasic[], dispatch: AppDispatch) {
  if (channels.length === 0) return;
  const allIds = new Set(channels.map((ch) => ch.id));
  const ids = (draft.channels || [])
    .map((ch) => ch.id)
    .filter((id) => allIds.has(id));
  dispatch(setSelectedChannelIds(ids));
}
