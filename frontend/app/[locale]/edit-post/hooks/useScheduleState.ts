'use client';

import { useRef, useEffect, useState } from 'react';
import { useRecentTimes } from '@/components/time-picker';
import type { SeriesPostSchedule } from './useEditPostLoader';

interface UseScheduleStateReturn {
  scheduledDate: Date | null;
  setScheduledDate: (d: Date | null) => void;
  hours: number;
  setHours: (h: number) => void;
  minutes: number;
  setMinutes: (m: number) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (v: boolean) => void;
  datePickerRef: React.RefObject<HTMLDivElement | null>;
  timePickerRef: React.RefObject<HTMLDivElement | null>;
  recentTimes: ReturnType<typeof useRecentTimes>;
}

export function useScheduleState(
  initial?: SeriesPostSchedule | null,
): UseScheduleStateReturn {
  const [scheduledDate, setScheduledDate] = useState<Date | null>(initial?.date ?? null);
  const [hours, setHours] = useState(initial?.hours ?? 12);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const recentTimes = useRecentTimes();

  useEffect(() => {
    if (initial) {
      setScheduledDate(initial.date);
      setHours(initial.hours);
      setMinutes(initial.minutes);
    }
  }, [initial]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setShowTimePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    scheduledDate,
    setScheduledDate,
    hours,
    setHours,
    minutes,
    setMinutes,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    datePickerRef,
    timePickerRef,
    recentTimes,
  };
}
