import { headers } from 'next/headers';

export async function getApiBaseUrl(): Promise<string> {
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(envBase)) return envBase;

  const h = await headers();
  const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  const basePath = envBase.startsWith('/') ? envBase : `/${envBase}`;

  if (!host) return envBase;
  return `${proto}://${host}${basePath}`;
}

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
