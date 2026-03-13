import { uploadMediaFile, API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';

interface ProcessedMedia {
  urls: string[];
  fileIds: string[];
}

export async function processMediaFiles(mediaFiles: Array<{ url?: string; file?: File }>): Promise<ProcessedMedia> {
  const urls: string[] = [];
  const fileIds: string[] = [];
  const baseUrl = API_BASE_URL.replace('/api', '');

  for (const mediaFile of mediaFiles) {
    let mediaUrl = mediaFile.url;
    let fileId: string | undefined;

    if (mediaFile.file && !mediaUrl) {
      const uploaded = await uploadMediaFile(mediaFile.file);
      mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
      fileId = uploaded.file_id;
    }

    if (mediaUrl) {
      urls.push(mediaUrl);
      if (fileId) {
        fileIds.push(fileId);
      }
    }
  }

  return { urls, fileIds };
}
