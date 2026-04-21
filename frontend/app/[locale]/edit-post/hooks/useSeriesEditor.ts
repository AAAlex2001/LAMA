'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch } from '../../create-post/store';
import { loadDraftById } from '../../create-post/store/thunks';
import type { SeriesPostInfo, SeriesPostSchedule } from './useEditPostLoader';

interface UseSeriesEditorParams {
  seriesPosts: SeriesPostInfo[];
  scheduledDate: Date | null;
  hours: number;
  minutes: number;
  setScheduledDate: (d: Date | null) => void;
  setHours: (h: number) => void;
  setMinutes: (m: number) => void;
  setShowDatePicker: (v: boolean) => void;
  setShowTimePicker: (v: boolean) => void;
  initialExpandedPostId: number | null;
  initialSchedules: Record<number, SeriesPostSchedule>;
  showError: (msg: string) => void;
}

interface UseSeriesEditorReturn {
  expandedPostId: number | null;
  seriesSchedules: Record<number, SeriesPostSchedule>;
  handleExpandSeriesPost: (spId: number) => Promise<void>;
}

export function useSeriesEditor({
  seriesPosts,
  scheduledDate,
  hours,
  minutes,
  setScheduledDate,
  setHours,
  setMinutes,
  setShowDatePicker,
  setShowTimePicker,
  initialExpandedPostId,
  initialSchedules,
  showError,
}: UseSeriesEditorParams): UseSeriesEditorReturn {
  const dispatch = useAppDispatch();
  const [expandedPostId, setExpandedPostId] = useState<number | null>(initialExpandedPostId);
  const [seriesSchedules, setSeriesSchedules] = useState<Record<number, SeriesPostSchedule>>(initialSchedules);

  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleExpandSeriesPost = useCallback(async (spId: number) => {
    if (expandedPostId === spId) return;
    const requestId = ++latestRequestIdRef.current;

    setSeriesSchedules((prev) => ({
      ...prev,
      [expandedPostId!]: { date: scheduledDate, hours, minutes },
    }));
    setShowDatePicker(false);
    setShowTimePicker(false);
    try {
      await dispatch(loadDraftById(spId)).unwrap();
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;

      setExpandedPostId(spId);
      const saved = seriesSchedules[spId];
      if (saved) {
        setScheduledDate(saved.date);
        setHours(saved.hours);
        setMinutes(saved.minutes);
      } else {
        setScheduledDate(null);
        setHours(12);
        setMinutes(0);
      }
    } catch {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
      showError('Ошибка загрузки поста');
    }
  }, [dispatch, expandedPostId, scheduledDate, hours, minutes, seriesSchedules, setScheduledDate, setHours, setMinutes, setShowDatePicker, setShowTimePicker, showError]);

  return {
    expandedPostId,
    seriesSchedules,
    handleExpandSeriesPost,
  };
}
