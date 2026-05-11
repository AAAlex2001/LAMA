import type { MediaFile } from '@/components/media-preview';
import type { InfoMessage } from '@/store/channels';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';

export function urlsToMediaFiles(urls: string[]): MediaFile[] {
  return urls.map((url, i) => {
    const isVideo = /\.(mp4|mov|avi|webm|m4v)/i.test(url);
    const isDoc = /\.(pdf|doc|docx|txt|zip|rar)/i.test(url);
    const type: 'video' | 'image' | 'document' = isVideo ? 'video' : isDoc ? 'document' : 'image';
    return {
      id: `edit-${i}-${Date.now()}`,
      type,
      url,
      preview_url: type === 'image' ? url : undefined,
    } as MediaFile;
  });
}

export function mediaFromInfoMessage(msg: InfoMessage): MediaFile[] {
  if (msg.media_urls && msg.media_urls.length > 0) {
    return urlsToMediaFiles(msg.media_urls);
  }
  if (msg.media_url && msg.media_type) {
    const t = msg.media_type.toUpperCase();
    const type = t === 'VIDEO' ? 'video' : t === 'DOCUMENT' ? 'document' : 'image';
    return [
      {
        id: 'edit-legacy',
        type,
        url: msg.media_url,
        preview_url: type === 'image' ? msg.media_url : undefined,
      } as MediaFile,
    ];
  }
  return [];
}

export async function resolveUploadedUrls(files: MediaFile[]): Promise<string[]> {
  const base = API_BASE_URL.replace('/api', '');
  const out: string[] = [];
  for (const mf of files) {
    if (mf.url) {
      out.push(mf.url.startsWith('http') ? mf.url : `${base}${mf.url}`);
      continue;
    }
    if (!mf.file) continue;
    const uploaded = await uploadMediaFile(mf.file);
    const url = uploaded.url.startsWith('http') ? uploaded.url : `${base}${uploaded.url}`;
    out.push(url);
  }
  return out;
}

export type SavingType = 'draft' | 'publish' | 'schedule' | null;
