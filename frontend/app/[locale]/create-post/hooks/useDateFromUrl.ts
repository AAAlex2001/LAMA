'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch } from '../store';
import { setSelectedDate, setHours, setMinutes } from '../store/slices/datePicker';

export function useDateFromUrl() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const dateParam = searchParams?.get('date');
    if (!dateParam) return;

    const parsed = new Date(dateParam + 'T00:00:00');
    if (isNaN(parsed.getTime())) return;

    appliedRef.current = true;

    const now = new Date();
    const isToday =
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate();

    dispatch(setSelectedDate(parsed));

    if (!isToday) {
      dispatch(setHours(12));
      dispatch(setMinutes(0));
    }
  }, [dispatch, searchParams]);
}
