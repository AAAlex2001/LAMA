import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';
import type { MediaFile } from '@/types/post';

export async function mediaFilesFromInput(files: FileList): Promise<MediaFile[]> {
  return Promise.all(
    Array.from(files).map(async (file) => {
      const type: 'video' | 'image' | 'document' = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'image'
          : 'document';

      let preview_url: string | undefined;
      let thumbnail_url: string | undefined;

      if (type === 'image') {
        preview_url = await compressImageForPreview(file);
      } else if (type === 'video') {
        thumbnail_url = await createVideoThumbnail(file);
      }

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        file,
        preview_url,
        thumbnail_url,
        size: file.size,
        blur: false,
      };
    }),
  );
}
