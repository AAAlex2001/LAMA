'use client';

import { useMediaPreviewStore } from './useMediaPreviewStore';
import MediaGrid from './components/MediaGrid';
import Lightbox from './components/Lightbox';
import DragGhost from './components/DragGhost';

export interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'document';
  file?: File;
  url?: string;
  name?: string;
  preview_url?: string;
  thumbnail_url?: string | null;
  blur?: boolean;
  size?: number;
}

interface MediaPreviewProps {
  files: MediaFile[];
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
}

export default function MediaPreview({
  files,
  onRemove,
  onToggleBlur,
  onMove,
}: MediaPreviewProps) {
  const store = useMediaPreviewStore();

  if (files.length === 0) return null;

  return (
    <>
      <MediaGrid
        files={files}
        store={store}
        onRemove={onRemove}
        onToggleBlur={onToggleBlur}
        onMove={onMove}
      />

      {store.dragGhost.visible && store.dragGhost.file && (
        <DragGhost
          file={store.dragGhost.file}
          x={store.dragGhost.x}
          y={store.dragGhost.y}
          previewUrl={store.getPreviewUrl(store.dragGhost.file)}
        />
      )}

      {store.lightbox.isOpen && store.lightbox.media && store.lightbox.url && (
        <Lightbox
          media={store.lightbox.media}
          url={store.lightbox.url}
          loading={store.lightbox.loading}
          onClose={store.closeLightbox}
          onLoaded={store.setLightboxLoaded}
        />
      )}
    </>
  );
}
