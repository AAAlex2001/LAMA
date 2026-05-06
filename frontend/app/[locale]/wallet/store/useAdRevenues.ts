'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createAdRevenue,
  deleteAdRevenue,
  fetchAdRevenues,
  fetchAdRevenueStats,
  updateAdRevenue,
} from './api';
import {
  AdRevenue,
  AdRevenueCreatePayload,
  AdRevenueListFilters,
  AdRevenueStats,
  AdRevenueUpdatePayload,
} from './types';

interface UseAdRevenuesResult {
  items: AdRevenue[];
  total: number;
  stats: AdRevenueStats | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  add: (payload: AdRevenueCreatePayload) => Promise<AdRevenue>;
  update: (id: number, payload: AdRevenueUpdatePayload) => Promise<AdRevenue>;
  remove: (id: number) => Promise<void>;
}

export function useAdRevenues(filters: AdRevenueListFilters = {}): UseAdRevenuesResult {
  const [items, setItems] = useState<AdRevenue[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdRevenueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetchAdRevenues(filters),
        fetchAdRevenueStats({
          channel_id: filters.channel_id,
          bot_id: filters.bot_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }),
      ]);
      setItems(listRes.items);
      setTotal(listRes.total);
      setStats(statsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [
    filters.type,
    filters.channel_id,
    filters.bot_id,
    filters.date_from,
    filters.date_to,
    filters.limit,
    filters.offset,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(async (payload: AdRevenueCreatePayload) => {
    const created = await createAdRevenue(payload);
    await reload();
    return created;
  }, [reload]);

  const update = useCallback(async (id: number, payload: AdRevenueUpdatePayload) => {
    const updated = await updateAdRevenue(id, payload);
    await reload();
    return updated;
  }, [reload]);

  const remove = useCallback(async (id: number) => {
    await deleteAdRevenue(id);
    await reload();
  }, [reload]);

  return { items, total, stats, loading, error, reload, add, update, remove };
}
