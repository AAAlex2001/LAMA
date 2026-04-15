'use client';

import { useRef, useEffect, useState } from 'react';
import { useAppDispatch } from '../../create-post/store';
import { loadDraftById } from '../../create-post/store/thunks';
import { apiRequest } from '../../create-post/store/thunks/api';

export interface SeriesPostInfo {
  id: number;
  series_order: number;
  scheduled_time: string | null;
  status: string;
}

export interface SeriesPostSchedule {
  date: Date | null;
  hours: number;
  minutes: number;
}

interface UseEditPostLoaderReturn {
  isPostLoading: boolean;
  postLoadError: string | null;
  seriesId: number | null;
  setSeriesId: (id: number | null) => void;
  seriesPosts: SeriesPostInfo[];
  setSeriesPosts: (posts: SeriesPostInfo[]) => void;
  seriesLoaded: boolean;
  initialSchedules: Record<number, SeriesPostSchedule>;
  expandedPostId: number | null;
  setExpandedPostId: (id: number | null) => void;
}

export function useEditPostLoader(
  postId: string | null,
  dateOverride: string | null,
): UseEditPostLoaderReturn {
  const dispatch = useAppDispatch();
  const loadedRef = useRef<string | null>(null);

  const [isPostLoading, setIsPostLoading] = useState(!!postId);
  const [postLoadError, setPostLoadError] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [seriesPosts, setSeriesPosts] = useState<SeriesPostInfo[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [initialSchedules, setInitialSchedules] = useState<Record<number, SeriesPostSchedule>>({});

  useEffect(() => {
    if (!postId) return;
    const id = Number(postId);
    if (!Number.isFinite(id) || id <= 0) return;
    const key = `post-${id}`;
    if (loadedRef.current === key) return;
    loadedRef.current = key;
    setIsPostLoading(true);
    setPostLoadError(null);

    dispatch(loadDraftById(id))
      .unwrap()
      .then(async (post) => {
        const schedules: Record<number, SeriesPostSchedule> = {};
        const effectiveTime = dateOverride || post.scheduled_time;
        if (effectiveTime) {
          const d = new Date(effectiveTime);
          schedules[id] = { date: d, hours: d.getHours(), minutes: d.getMinutes() };
        }
        if (post.series_id) {
          setSeriesId(post.series_id);
          setExpandedPostId(id);
          try {
            const res = await apiRequest<{ items: SeriesPostInfo[] }>(
              `/publications?series_id=${post.series_id}&page_size=50&sort_order=asc`,
            );
            const posts = [...res.items].sort(
              (a, b) => (a.series_order ?? 0) - (b.series_order ?? 0),
            );
            setSeriesPosts(posts);

            for (const sp of posts) {
              if (sp.id === id) continue;
              if (sp.scheduled_time) {
                const d = new Date(sp.scheduled_time);
                schedules[sp.id] = { date: d, hours: d.getHours(), minutes: d.getMinutes() };
              } else {
                schedules[sp.id] = { date: null, hours: 12, minutes: 0 };
              }
            }

            const otherPosts = posts.filter((sp) => sp.id !== id);
            for (const sp of otherPosts) {
              try {
                await dispatch(loadDraftById(sp.id)).unwrap();
              } catch {
                // ignore individual load errors
              }
            }
            await dispatch(loadDraftById(id)).unwrap();
            setSeriesLoaded(true);
          } catch {
            // ignore
          }
        } else {
          setExpandedPostId(null);
        }
        setInitialSchedules(schedules);
      })
      .catch((err) => {
        setPostLoadError(typeof err === 'string' ? err : 'Ошибка загрузки поста');
      })
      .finally(() => {
        setIsPostLoading(false);
      });
  }, [dispatch, postId]);

  return {
    isPostLoading,
    postLoadError,
    seriesId,
    setSeriesId,
    seriesPosts,
    setSeriesPosts,
    seriesLoaded,
    initialSchedules,
    expandedPostId,
    setExpandedPostId,
  };
}
