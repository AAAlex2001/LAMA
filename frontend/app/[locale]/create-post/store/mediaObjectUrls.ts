import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';

export function revokeMediaObjectUrls(mediaFiles: MediaFile[]): void {
  for (const file of mediaFiles) {
    if (file.preview_url?.startsWith('blob:')) {
      URL.revokeObjectURL(file.preview_url);
    }
    if (file.url?.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
  }
}
