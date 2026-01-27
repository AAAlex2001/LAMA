'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './index';
import * as editorSlice from './slices/editor';
import * as mediaSlice from './slices/media';
import * as inlineButtonsSlice from './slices/inlineButtons';
import * as quizSlice from './slices/quiz';
import * as settingsSlice from './slices/settings';
import * as uiSlice from './slices/ui';
import * as seriesSlice from './slices/series';
import {
  publishNow,
  publishSeries,
  saveDraft,
  schedulePost,
  saveAsTemplate,
  loadChannels,
  loadRecentTags,
} from './thunks';
import * as selectors from './selectors';
import type { MediaFile, ButtonRow } from './types';

export function useCreatePost() {
  const dispatch = useAppDispatch();

  const text = useAppSelector(selectors.selectEditorText);
  const showLinkPreview = useAppSelector(selectors.selectShowLinkPreview);

  const mediaFiles = useAppSelector(selectors.selectMediaFiles);
  const mediaCount = useAppSelector(selectors.selectMediaCount);
  const canAddMedia = useAppSelector(selectors.selectCanAddMedia);

  const inlineButtonsOpen = useAppSelector(selectors.selectInlineButtonsOpen);
  const buttonRows = useAppSelector(selectors.selectInlineButtonRows);
  const canShowInlineButtons = useAppSelector(selectors.selectCanShowInlineButtons);

  const quizState = useAppSelector(selectors.selectQuizState);
  const quizOpen = useAppSelector(selectors.selectQuizOpen);

  const channels = useAppSelector(selectors.selectChannels);
  const selectedChannels = useAppSelector(selectors.selectSelectedChannels);
  const selectedCount = useAppSelector(selectors.selectSelectedCount);
  const primaryChannel = useAppSelector(selectors.selectPrimaryChannel);
  const canReplyToPost = useAppSelector(selectors.selectCanReplyToPost);

  const tagName = useAppSelector(selectors.selectTagName);
  const tagColor = useAppSelector(selectors.selectTagColor);
  const recentTags = useAppSelector(selectors.selectRecentTags);

  const uiState = useAppSelector(selectors.selectUiState);
  const isPublishing = useAppSelector(selectors.selectIsPublishing);
  const isSavingDraft = useAppSelector(selectors.selectIsSavingDraft);
  const isScheduling = useAppSelector(selectors.selectIsScheduling);
  const showPreviewModal = useAppSelector(selectors.selectShowPreviewModal);
  const showMobileSettings = useAppSelector(selectors.selectShowMobileSettings);

  const snapshots = useAppSelector(selectors.selectSnapshots);
  const activeIndex = useAppSelector(selectors.selectActiveIndex);
  const isSeriesMode = useAppSelector(selectors.selectIsSeriesMode);

  const hasContentForPreview = useAppSelector(selectors.selectHasContentForPreview);
  const currentSnapshot = useAppSelector(selectors.selectCurrentSnapshot);
  const quizPreviewData = useAppSelector(selectors.selectQuizPreviewData);
  const inlineKeyboard = useAppSelector(selectors.selectInlineKeyboardPreview);

  const setText = useCallback((val: string) => dispatch(editorSlice.setText(val)), [dispatch]);
  const setShowLinkPreview = useCallback((val: boolean) => dispatch(editorSlice.setShowLinkPreview(val)), [dispatch]);
  const resetEditor = useCallback(() => dispatch(editorSlice.resetEditor()), [dispatch]);

  const addFiles = useCallback((files: MediaFile[]) => dispatch(mediaSlice.addFiles(files)), [dispatch]);
  const removeFile = useCallback((id: string) => dispatch(mediaSlice.removeFile(id)), [dispatch]);
  const setFiles = useCallback((files: MediaFile[]) => dispatch(mediaSlice.setFiles(files)), [dispatch]);
  const moveFile = useCallback((from: number, to: number) => dispatch(mediaSlice.moveFile({ from, to })), [dispatch]);
  const toggleBlur = useCallback((id: string) => dispatch(mediaSlice.toggleBlur(id)), [dispatch]);
  const clearFiles = useCallback(() => dispatch(mediaSlice.clearFiles()), [dispatch]);

  const openInlineButtons = useCallback(() => dispatch(inlineButtonsSlice.open()), [dispatch]);
  const closeInlineButtons = useCallback(() => dispatch(inlineButtonsSlice.close()), [dispatch]);
  const toggleInlineButtons = useCallback(() => dispatch(inlineButtonsSlice.toggle()), [dispatch]);
  const setButtonRows = useCallback((rows: ButtonRow[]) => dispatch(inlineButtonsSlice.setRows(rows)), [dispatch]);
  const addButtonRow = useCallback(() => dispatch(inlineButtonsSlice.addRow()), [dispatch]);
  const addButtonColumn = useCallback((rowId: string) => dispatch(inlineButtonsSlice.addColumn(rowId)), [dispatch]);
  const updateButton = useCallback(
    (rowId: string, buttonId: string, updates: Partial<{ text: string; url: string; type: string }>) =>
      dispatch(inlineButtonsSlice.updateButton({ rowId, buttonId, updates })),
    [dispatch]
  );
  const deleteButton = useCallback(
    (rowId: string, buttonId: string) => dispatch(inlineButtonsSlice.deleteButton({ rowId, buttonId })),
    [dispatch]
  );

  const setQuizMode = useCallback((mode: 'poll' | 'quiz') => dispatch(quizSlice.setMode(mode)), [dispatch]);
  const setQuizOpen = useCallback((val: boolean) => dispatch(quizSlice.setOpen(val)), [dispatch]);
  const setQuizQuestion = useCallback((q: string) => dispatch(quizSlice.setQuestion(q)), [dispatch]);
  const setQuizAnswers = useCallback(
    (answers: Array<{ id: string; text: string }>) => dispatch(quizSlice.setAnswers(answers)),
    [dispatch]
  );
  const addQuizAnswer = useCallback(() => dispatch(quizSlice.addAnswer()), [dispatch]);
  const removeQuizAnswer = useCallback((id: string) => dispatch(quizSlice.removeAnswer(id)), [dispatch]);
  const setQuizCorrectAnswer = useCallback((id: string | null) => dispatch(quizSlice.setCorrectAnswer(id)), [dispatch]);
  const resetQuiz = useCallback(() => dispatch(quizSlice.resetQuiz()), [dispatch]);

  const setChannels = useCallback(
    (chs: Array<{ id: number; name: string; avatar: string; checked: boolean }>) =>
      dispatch(settingsSlice.setChannels(chs)),
    [dispatch]
  );
  const toggleChannel = useCallback((id: number) => dispatch(settingsSlice.toggleChannel(id)), [dispatch]);
  const setNotifySubscribers = useCallback((val: boolean) => dispatch(settingsSlice.setNotifySubscribers(val)), [dispatch]);
  const setPinPost = useCallback((val: boolean) => dispatch(settingsSlice.setPinPost(val)), [dispatch]);
  const selectTag = useCallback(
    (name: string, color: string) => dispatch(settingsSlice.selectTag({ name, color })),
    [dispatch]
  );
  const clearTag = useCallback(() => dispatch(settingsSlice.clearTag()), [dispatch]);
  const setRecentTags = useCallback(
    (tags: Array<{ name: string; color: string }>) => dispatch(settingsSlice.setRecentTags(tags)),
    [dispatch]
  );
  const setRepeatEnabled = useCallback((val: boolean) => dispatch(settingsSlice.setRepeatEnabled(val)), [dispatch]);
  const setRepeatInterval = useCallback((val: string) => dispatch(settingsSlice.setRepeatInterval(val)), [dispatch]);
  const setRepeatEndDate = useCallback((val: Date | null) => dispatch(settingsSlice.setRepeatEndDate(val?.toISOString() ?? null)), [dispatch]);
  const setAutoDeleteEnabled = useCallback((val: boolean) => dispatch(settingsSlice.setAutoDeleteEnabled(val)), [dispatch]);
  const setAutoDeleteTime = useCallback((val: string | null) => dispatch(settingsSlice.setAutoDeleteTime(val)), [dispatch]);
  const setProtectContent = useCallback((val: boolean) => dispatch(settingsSlice.setProtectContent(val)), [dispatch]);
  const setReplyToPostId = useCallback((val: number | null) => dispatch(settingsSlice.setReplyToPostId(val)), [dispatch]);
  const resetSettings = useCallback(() => dispatch(settingsSlice.resetSettings()), [dispatch]);

  const setShowPreviewModal = useCallback((val: boolean) => dispatch(uiSlice.setShowPreviewModal(val)), [dispatch]);
  const setShowMobileSettings = useCallback((val: boolean) => dispatch(uiSlice.setShowMobileSettings(val)), [dispatch]);
  const setIsPublishing = useCallback((val: boolean) => dispatch(uiSlice.setIsPublishing(val)), [dispatch]);
  const setIsSavingDraft = useCallback((val: boolean) => dispatch(uiSlice.setIsSavingDraft(val)), [dispatch]);
  const setIsScheduling = useCallback((val: boolean) => dispatch(uiSlice.setIsScheduling(val)), [dispatch]);
  const setIsLoadingAi = useCallback((val: boolean) => dispatch(uiSlice.setIsLoadingAi(val)), [dispatch]);
  const resetUi = useCallback(() => dispatch(uiSlice.resetUi()), [dispatch]);

  const addPost = useCallback(() => dispatch(seriesSlice.addPost(currentSnapshot)), [dispatch, currentSnapshot]);
  const removePost = useCallback((index: number) => dispatch(seriesSlice.removePost(index)), [dispatch]);
  const setActiveIndex = useCallback((index: number) => dispatch(seriesSlice.setActiveIndex(index)), [dispatch]);
  const saveCurrentSnapshot = useCallback(
    () => dispatch(seriesSlice.saveCurrentSnapshot({ index: activeIndex, snapshot: currentSnapshot })),
    [dispatch, activeIndex, currentSnapshot]
  );

  const doPublishNow = useCallback(
    (channelIds: number[]) => isSeriesMode 
      ? dispatch(publishSeries(channelIds)) 
      : dispatch(publishNow(channelIds)),
    [dispatch, isSeriesMode]
  );
  const doSaveDraft = useCallback((channelIds: number[]) => dispatch(saveDraft(channelIds)), [dispatch]);
  const doSchedulePost = useCallback((date: Date) => dispatch(schedulePost(date.toISOString())), [dispatch]);
  const doSaveAsTemplate = useCallback(() => dispatch(saveAsTemplate()), [dispatch]);
  const doLoadChannels = useCallback((token: string) => dispatch(loadChannels(token)), [dispatch]);
  const doLoadRecentTags = useCallback((token: string, channelId: number) => dispatch(loadRecentTags({ token, channelId })), [dispatch]);

  const resetAll = useCallback(() => {
    dispatch(editorSlice.resetEditor());
    dispatch(mediaSlice.clearFiles());
    dispatch(inlineButtonsSlice.reset());
    dispatch(quizSlice.resetQuiz());
    dispatch(settingsSlice.resetSettings());
    dispatch(uiSlice.resetUi());
    dispatch(seriesSlice.resetSeries());
  }, [dispatch]);

  return {
    text,
    showLinkPreview,
    mediaFiles,
    mediaCount,
    canAddMedia,
    inlineButtonsOpen,
    buttonRows,
    canShowInlineButtons,
    quizState,
    quizOpen,
    channels,
    selectedChannels,
    selectedCount,
    primaryChannel,
    canReplyToPost,
    tagName,
    tagColor,
    recentTags,
    uiState,
    isPublishing,
    isSavingDraft,
    isScheduling,
    showPreviewModal,
    showMobileSettings,
    snapshots,
    activeIndex,
    isSeriesMode,
    hasContentForPreview,
    currentSnapshot,
    quizPreviewData,
    inlineKeyboard,

    setText,
    setShowLinkPreview,
    resetEditor,

    addFiles,
    removeFile,
    setFiles,
    moveFile,
    toggleBlur,
    clearFiles,

    openInlineButtons,
    closeInlineButtons,
    toggleInlineButtons,
    setButtonRows,
    addButtonRow,
    addButtonColumn,
    updateButton,
    deleteButton,

    setQuizMode,
    setQuizOpen,
    setQuizQuestion,
    setQuizAnswers,
    addQuizAnswer,
    removeQuizAnswer,
    setQuizCorrectAnswer,
    resetQuiz,

    setChannels,
    toggleChannel,
    setNotifySubscribers,
    setPinPost,
    selectTag,
    clearTag,
    setRecentTags,
    setRepeatEnabled,
    setRepeatInterval,
    setRepeatEndDate,
    setAutoDeleteEnabled,
    setAutoDeleteTime,
    setProtectContent,
    setReplyToPostId,
    resetSettings,

    setShowPreviewModal,
    setShowMobileSettings,
    setIsPublishing,
    setIsSavingDraft,
    setIsScheduling,
    setIsLoadingAi,
    resetUi,

    addPost,
    removePost,
    setActiveIndex,
    saveCurrentSnapshot,

    doPublishNow,
    doSaveDraft,
    doSchedulePost,
    doSaveAsTemplate,
    doLoadChannels,
    doLoadRecentTags,

    resetAll,
  };
}
