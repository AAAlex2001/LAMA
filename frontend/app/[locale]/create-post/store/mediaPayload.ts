import type { MediaFile } from '@/components/media-preview';
import { uploadMediaFiles } from './api';

export interface PreparedMediaPayload {
  mediaUrls: string[];
  mediaFileIds?: string[];
  mediaThumbnailUrls?: Array<string | null>;
  mediaBlurArray: boolean[];
}

export async function prepareMediaPayload(mediaFiles: MediaFile[]): Promise<PreparedMediaPayload> {
  const mediaBlurArray = mediaFiles.map(f => f.blur || false);

  if (mediaFiles.length === 0) {
    return { mediaUrls: [], mediaBlurArray };
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';

  const filesToUpload = mediaFiles.filter(f => f.file);
  let uploadedUrls: string[] = [];
  let uploadedFileIds: Array<string | undefined> = [];
  let uploadedThumbnailUrls: Array<string | null> = [];

  if (filesToUpload.length > 0) {
    try {
      const uploadResponse = await uploadMediaFiles(filesToUpload.map(f => f.file as File));

      uploadedUrls = uploadResponse.files.map(f => {
        if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
          return f.url;
        }
        return `${baseUrl}${f.url}`;
      });

      uploadedFileIds = (uploadResponse.file_ids || []).map(id => id || undefined);
      uploadedThumbnailUrls = (uploadResponse.thumbnail_urls || []).map(url => url || null);
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw new Error('Не удалось загрузить медиа файлы');
    }
  }

  const finalUrls: string[] = [];
  const finalFileIds: Array<string | null> = [];
  const finalThumbnailUrls: Array<string | null> = [];
  let uploadIndex = 0;

  for (const mediaFile of mediaFiles) {
    if (mediaFile.file) {
      const url = uploadedUrls[uploadIndex];
      if (url) {
        finalUrls.push(url);
        finalFileIds.push(uploadedFileIds[uploadIndex] ?? null);
        finalThumbnailUrls.push(uploadedThumbnailUrls[uploadIndex] ?? null);
      }
      uploadIndex += 1;
      continue;
    }

    if (mediaFile.url) {
      finalUrls.push(mediaFile.url);
      finalFileIds.push(mediaFile.telegram_file_id ?? null);
      finalThumbnailUrls.push(mediaFile.thumbnail_url ?? null);
    }
  }

  return {
    mediaUrls: finalUrls,
    mediaFileIds: finalUrls.length > 0 ? (finalFileIds as unknown as string[]) : undefined,
    mediaThumbnailUrls: finalUrls.length > 0 ? finalThumbnailUrls : undefined,
    mediaBlurArray,
  };
}
