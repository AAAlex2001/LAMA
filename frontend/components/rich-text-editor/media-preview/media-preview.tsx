'use client';

import styles from './media-preview.module.scss';
import BlurIcon from '@/components/icons/blur-icon';
import CloseIcon from '@/components/icons/close-icon';
import PlayIcon from '@/components/icons/play-icon';
import DocumentIcon from '@/components/icons/document-icon';

export interface MediaFile {
  id: string;
  url: string;  // Preview URL (для отображения, может быть base64)
  type: 'image' | 'video' | 'document';
  blur?: boolean;
  file?: File;  // Оригинальный File объект для загрузки на сервер
}

interface MediaPreviewProps {
  files: MediaFile[];
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
}

export default function MediaPreview({ files, onRemove, onToggleBlur }: MediaPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.mediaGrid}>
      {files.map((file) => (
        <div key={file.id} className={styles.mediaItem}>
          {file.type === 'document' ? (
            <div className={styles.documentIcon}>
              <DocumentIcon width={32} height={32} color="#CED2D6" />
            </div>
          ) : file.type === 'video' ? (
            <>
              <img 
                src={file.url} 
                alt="Video preview" 
                className={styles.mediaImage}
                style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
              />
              <div className={styles.playIcon}>
                <PlayIcon width={24} height={24} color="#CED2D6" />
              </div>
            </>
          ) : (
            <img 
              src={file.url} 
              alt="Media preview" 
              className={styles.mediaImage}
              style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
            />
          )}
          
          <div className={styles.mediaControls}>
            <button
              className={`${styles.controlButton} ${file.blur ? styles.active : ''}`}
              onClick={() => onToggleBlur(file.id)}
              aria-label="Размыть медиа"
              type="button"
            >
              <BlurIcon width={16} height={16} color="#383F45" />
            </button>
            
            <button
              className={styles.controlButton}
              onClick={() => onRemove(file.id)}
              aria-label="Удалить медиа"
              type="button"
            >
              <CloseIcon width={16} height={16} color="#383F45" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
