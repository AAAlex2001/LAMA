import { useCallback } from 'react';
import { useNotifications } from '@/components/notifications';
import { publishNow, publishSeries, schedulePost } from '../store/thunks';
import { validatePost, validateTelegramMediaRules } from '../store/thunks/utils';
import { saveCurrentSnapshot } from '../store/slices/series';
import type { AppDispatch } from '../store';
import type { MediaFile, ButtonRow, QuizMode, QuizAnswer, PostSnapshot, PollData } from '../store/types';

interface UsePublishHandlersParams {
  dispatch: AppDispatch;
  selectedChannels: Array<{ id: number }>;
  text: string;
  mediaFiles: MediaFile[];
  pollData: PollData | null;
  snapshots: PostSnapshot[];
  activeIndex: number;
  inlineButtonsOpen: boolean;
  buttonRows: ButtonRow[];
  quizOpen: boolean;
  quizMode: QuizMode;
  quizQuestion: string;
  quizAnswers: QuizAnswer[];
  quizCorrectAnswerId: string | null;
  showLinkPreview: boolean;
}

export function usePublishHandlers({
  dispatch,
  selectedChannels,
  text,
  mediaFiles,
  pollData,
  snapshots,
  activeIndex,
  inlineButtonsOpen,
  buttonRows,
  quizOpen,
  quizMode,
  quizQuestion,
  quizAnswers,
  quizCorrectAnswerId,
  showLinkPreview,
}: UsePublishHandlersParams) {
  const { showError, showSuccess } = useNotifications();
  const toSerializableSnapshot = (snapshot: PostSnapshot): PostSnapshot => ({
    ...snapshot,
    mediaFiles: snapshot.mediaFiles.map(({ file: _file, ...rest }) => rest),
  });

  const validateSinglePost = useCallback((postText: string, files: MediaFile[], poll: PollData | null) => {
    const channelIds = selectedChannels.map(c => c.id);
    const error = validatePost(postText, files.length, poll, channelIds);
    if (error) return error;
    const mediaError = validateTelegramMediaRules(postText, files, poll);
    if (mediaError) return mediaError;
    return null;
  }, [selectedChannels]);

  const handlePublishNow = useCallback(async () => {
    const error = validateSinglePost(text, mediaFiles, pollData);
    if (error) {
      showError(error);
      return;
    }
    try {
      const result = await dispatch(publishNow(selectedChannels.map(c => c.id))).unwrap();
      showSuccess(result?.message || 'Пост поставлен в очередь');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка публикации');
    }
  }, [dispatch, mediaFiles, pollData, selectedChannels, showError, showSuccess, text, validateSinglePost]);

  const handlePublishSeries = useCallback(async () => {
    const currentSnap: PostSnapshot = {
      text,
      mediaFiles,
      inlineButtonsOpen,
      buttonRows,
      quizOpen,
      quizMode,
      quizQuestion,
      quizAnswers,
      quizCorrectAnswerId,
      showLinkPreview,
    };
    dispatch(saveCurrentSnapshot(toSerializableSnapshot(currentSnap)));

    try {
      const result = await dispatch(publishSeries()).unwrap();
      showSuccess(result?.message || 'Серия поставлена в очередь');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка публикации серии');
    }
  }, [
    buttonRows, dispatch, inlineButtonsOpen, mediaFiles,
    quizAnswers, quizCorrectAnswerId, quizMode, quizOpen, quizQuestion,
    showError, showLinkPreview, showSuccess, text,
  ]);

  const handleSchedule = useCallback(async (date: Date) => {
    const error = validateSinglePost(text, mediaFiles, pollData);
    if (error) {
      showError(error);
      return;
    }
    try {
      const result = await dispatch(schedulePost({ channelIds: selectedChannels.map(c => c.id), scheduledDate: date })).unwrap();
      showSuccess(result?.message || 'Пост запланирован');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка планирования');
    }
  }, [dispatch, mediaFiles, pollData, selectedChannels, showError, showSuccess, text, validateSinglePost]);

  return { handlePublishNow, handlePublishSeries, handleSchedule };
}
