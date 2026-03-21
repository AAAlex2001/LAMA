import type { Draft } from '@/types/post';
import type { MediaFile } from '@/components/media-preview';

export function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

export function getMediaFilterTypes(urls: string[]): Set<string> {
  const types = new Set<string>();
  for (const url of urls) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) types.add('photo');
    else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) types.add('video');
    else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) types.add('audio');
    else if (ext === 'gif') types.add('gif');
    else types.add('doc');
  }
  return types;
}

export function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, i) => ({
    id: `calendar-media-${draft.id}-${i}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[i] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[i] ?? null,
    telegram_file_id: draft.media_file_ids?.[i] ?? null,
  }));
}
