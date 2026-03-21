import type { Draft } from '@/types/post';
import { formatDateOnly } from './date-helpers';

export function mergeUniqueById(existing: Draft[], incoming: Draft[]): Draft[] {
  const seen = new Set<number>();
  const result: Draft[] = [];
  for (const post of [...existing, ...incoming]) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    result.push(post);
  }
  return result;
}

export function buildCreatePostUrl(date: Date): string {
  return `/create-post?date=${formatDateOnly(date)}`;
}
