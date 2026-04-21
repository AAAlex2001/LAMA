import type { Draft } from '@/types/post';
import { formatDateOnly } from './date-helpers';

export function mergeUniqueById(existing: Draft[], incoming: Draft[]): Draft[] {
  const seen = new Set<string>();
  const result: Draft[] = [];
  for (const post of [...existing, ...incoming]) {
    const key = `${post.id}|${post.scheduled_time ?? post.created_at ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(post);
  }
  return result;
}

export function buildCreatePostUrl(date: Date): string {
  return `/create-post?date=${formatDateOnly(date)}`;
}
