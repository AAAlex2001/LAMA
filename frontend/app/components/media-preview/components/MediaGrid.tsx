import { MediaFile } from '../media-preview';
import { useMediaPreviewStore } from '../useMediaPreviewStore';
import MediaItem from './MediaItem';
import styles from '../media-preview.module.scss';

interface MediaGridProps {
  files: MediaFile[];
  store: ReturnType<typeof useMediaPreviewStore>;
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
}

export default function MediaGrid({ files, store, onRemove, onToggleBlur, onMove }: MediaGridProps) {
  return (
    <div className={styles.mediaGrid}>
      {files.map(file => (
        <MediaItem
          key={file.id}
          file={file}
          files={files}
          store={store}
          onRemove={onRemove}
          onToggleBlur={onToggleBlur}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
