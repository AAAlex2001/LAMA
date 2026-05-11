import { MediaFile } from '../media-preview';
import DocumentIcon from '@/components/icons/document-icon';
import PlayIcon from '@/components/icons/play-icon';
import styles from '../media-preview.module.scss';

interface DragGhostProps {
  file: MediaFile;
  x: number;
  y: number;
  previewUrl: string;
}

export default function DragGhost({ file, x, y, previewUrl }: DragGhostProps) {
  return (
    <div
      className={styles.dragGhost}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className={styles.dragGhostContent}>
        {file.type === 'document' ? (
          <DocumentIcon width={32} height={32} color="#CED2D6" />
        ) : file.type === 'video' ? (
          <>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Dragging"
                className={styles.mediaImage}
                style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
              />
            )}
            <div className={styles.playIcon}>
              <PlayIcon width={24} height={24} color="#CED2D6" />
            </div>
          </>
        ) : (
          previewUrl && (
            <img
              src={previewUrl}
              alt="Dragging"
              className={styles.mediaImage}
              style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
            />
          )
        )}
      </div>
    </div>
  );
}
