import { uploadMediaFile, API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';

export async function processMediaFiles(mediaFiles: Array<{ url?: string; file?: File }>): Promise<string[]> {
  const mediaUrls: string[] = [];
  const baseUrl = API_BASE_URL.replace('/api', '');

  for (const mediaFile of mediaFiles) {
    let mediaUrl = mediaFile.url;

    if (mediaFile.file && !mediaUrl) {
      const uploaded = await uploadMediaFile(mediaFile.file);
      mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
    }

    if (mediaUrl) {
      mediaUrls.push(mediaUrl);
    }
  }

  return mediaUrls;
}
