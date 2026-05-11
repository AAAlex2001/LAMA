'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/store/api';
import type { QuickTime } from './time-picker';

function parseTimeString(t: string): QuickTime | null {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { label: t, hours: h, minutes: m };
}

export function useRecentTimes(): QuickTime[] | undefined {
  const [times, setTimes] = useState<QuickTime[] | undefined>(undefined);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    apiRequest<string[]>(`/publications/recent-times?limit=5&tz=${encodeURIComponent(tz)}`)
      .then((data) => {
        const parsed = data.map(parseTimeString).filter(Boolean) as QuickTime[];
        if (parsed.length > 0) setTimes(parsed);
      })
      .catch(() => {});
  }, []);

  return times;
}
