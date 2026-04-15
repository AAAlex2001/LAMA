'use client';

import { useState, useCallback } from 'react';
import type { AppDispatch } from '../../create-post/store';
import { updatePost, createSingleOccurrence, moveToDraft } from '../../create-post/store/thunks/updatePost';
import { apiRequest } from '../../create-post/store/thunks/api';
import type { SeriesPostInfo } from './useEditPostLoader';
import type { ChannelBasic } from '@/types';

interface UseEditPostActionsParams {
  activePostId: number | null;
  dateOverride: string | null;
  seriesId: number | null;
  seriesPosts: SeriesPostInfo[];
  selectedChannels: ChannelBasic[];
  scheduledDate: Date | null;
  hours: number;
  minutes: number;
  dispatch: AppDispatch;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  setSeriesId: (id: number | null) => void;
  setSeriesPosts: (posts: SeriesPostInfo[]) => void;
}

interface UseEditPostActionsReturn {
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleMoveToDraft: () => Promise<void>;
  handleDeleteFromSeries: () => Promise<void>;
}

export function useEditPostActions({
  activePostId,
  dateOverride,
  seriesId,
  seriesPosts,
  selectedChannels,
  scheduledDate,
  hours,
  minutes,
  dispatch,
  showSuccess,
  showError,
  setSeriesId,
  setSeriesPosts,
}: UseEditPostActionsParams): UseEditPostActionsReturn {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activePostId) return;
    const channelIds = selectedChannels.map((c) => c.id);
    const scheduledDateTime = scheduledDate ? new Date(scheduledDate) : new Date();
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    setIsSaving(true);

    if (dateOverride) {
      const result = await dispatch(
        createSingleOccurrence({ channelIds, scheduledDate: scheduledDateTime }),
      );
      if (createSingleOccurrence.fulfilled.match(result)) {
        try {
          const dateStr = new Date(dateOverride).toISOString().slice(0, 10);
          await apiRequest(
            `/publications/${activePostId}?repeat_mode=this&repeat_date=${dateStr}`,
            { method: 'DELETE' },
          );
        } catch {
          // exclusion failed but new post was created
        }
        showSuccess('Изменения сохранены!');
        setTimeout(() => { window.location.href = '/calendar'; }, 1500);
      } else if (createSingleOccurrence.rejected.match(result)) {
        showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения');
      }
      setIsSaving(false);
      return;
    }

    const result = await dispatch(
      updatePost({ postId: activePostId, channelIds, scheduledDate: scheduledDateTime }),
    );
    if (updatePost.fulfilled.match(result)) {
      showSuccess('Изменения сохранены!');
      setTimeout(() => { window.location.href = '/calendar'; }, 1500);
    } else if (updatePost.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения');
    }
    setIsSaving(false);
  }, [activePostId, selectedChannels, scheduledDate, hours, minutes, dateOverride, dispatch, showSuccess, showError]);

  const handleMoveToDraft = useCallback(async () => {
    if (!activePostId) return;

    if (dateOverride) {
      try {
        const dateStr = new Date(dateOverride).toISOString().slice(0, 10);
        await apiRequest(
          `/publications/${activePostId}?repeat_mode=this&repeat_date=${dateStr}`,
          { method: 'DELETE' },
        );
        showSuccess('Повтор на эту дату исключён');
        setTimeout(() => { window.location.href = '/calendar'; }, 1500);
      } catch {
        showError('Ошибка исключения повтора');
      }
      return;
    }

    if (seriesId && seriesPosts.length > 0) {
      try {
        for (const sp of seriesPosts) {
          await dispatch(moveToDraft(sp.id)).unwrap();
        }
        showSuccess('Серия перенесена в черновики');
        setTimeout(() => { window.location.href = '/drafts'; }, 1500);
      } catch {
        showError('Ошибка переноса в черновики');
      }
    } else {
      const result = await dispatch(moveToDraft(activePostId));
      if (moveToDraft.fulfilled.match(result)) {
        showSuccess('Пост перенесён в черновики');
        setTimeout(() => { window.location.href = '/drafts'; }, 1500);
      } else if (moveToDraft.rejected.match(result)) {
        showError(typeof result.payload === 'string' ? result.payload : 'Ошибка');
      }
    }
  }, [activePostId, dateOverride, seriesId, seriesPosts, dispatch, showSuccess, showError]);

  const handleDeleteFromSeries = useCallback(async () => {
    if (!seriesId) return;
    try {
      await apiRequest(`/publications/series/${seriesId}`, { method: 'DELETE' });
      setSeriesId(null);
      setSeriesPosts([]);
      showSuccess('Серия постов удалена');
      setTimeout(() => { window.location.href = '/calendar'; }, 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка');
    }
  }, [seriesId, showSuccess, showError, setSeriesId, setSeriesPosts]);

  return {
    isSaving,
    handleSave,
    handleMoveToDraft,
    handleDeleteFromSeries,
  };
}
