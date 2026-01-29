import { MediaFile } from '../media-preview';
import { useMediaPreviewStore } from '../useMediaPreviewStore';
import MediaContent from './MediaContent';
import MediaControls from './MediaControls';
import styles from '../media-preview.module.scss';

interface MediaItemProps {
  file: MediaFile;
  files: MediaFile[];
  store: ReturnType<typeof useMediaPreviewStore>;
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
}

export default function MediaItem({ file, files, store, onRemove, onToggleBlur, onMove }: MediaItemProps) {
  const isDragging = store.draggingId === file.id;
  const isDragOver = store.dragOverId === file.id;
  const isLoaded = store.loadedImages.has(file.id);
  const previewUrl = store.getPreviewUrl(file);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-controls]')) return;
    if (store.shouldSuppressClick()) return;
    if (file.type !== 'document') {
      store.openLightbox(file);
    }
  };

  return (
    <div
      className={`
        ${styles.mediaItem}
        ${isDragging ? styles.dragging : ''}
        ${isDragOver ? styles.dragOver : ''}
      `}
      data-media-id={file.id}
      draggable={false}
      onClick={handleClick}
      onDragStart={e => store.handleDragStart(e, file.id)}
      onDragEnd={store.handleDragEnd}
      onDragOver={e => store.handleDragOver(e, file.id)}
      onDragLeave={() => store.handleDragLeave(file.id)}
      onDrop={e => store.handleDrop(e, file.id, onMove)}
      onPointerDown={e => store.handlePointerDown(e, file.id, files)}
      onPointerMove={store.handlePointerMove}
      onPointerUp={e => store.finishPointerDrag(e, onMove)}
      onPointerCancel={e => store.finishPointerDrag(e, onMove)}
    >
      <MediaContent
        file={file}
        previewUrl={previewUrl}
        isLoaded={isLoaded}
        onLoad={() => store.markImageLoaded(file.id)}
      />

      <MediaControls
        blur={file.blur ?? false}
        onToggleBlur={() => onToggleBlur(file.id)}
        onRemove={() => onRemove(file.id)}
      />
    </div>
  );
}
