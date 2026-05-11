'use client';

import { FC, RefObject } from 'react';
import MediaPreview from '@/components/media-preview';
import type { MediaFile } from '@/components/media-preview';
import OldButton from '@/components/button/button';
import { PaperclipIcon } from '@/components/icons';
import styles from '../CreateAutoReplyModal.module.scss';

interface MediaSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: MediaFile[];
  isUploading: boolean;
  canAddMedia: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
}

const MediaSection: FC<MediaSectionProps> = ({
  fileInputRef,
  files,
  isUploading,
  canAddMedia,
  onFileUpload,
  onRemove,
  onToggleBlur,
  onMove,
}) => {
  return (
    <div className={styles.mediaSection}>
      <span className={styles.mediaLabel}>Медиа и файлы</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={onFileUpload}
        style={{ display: 'none' }}
      />
      <div className={styles.mediaDropzone}>
        {files.length === 0 ? (
          <>
            <span className={styles.mediaDropzoneText}>
              Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
            </span>
            <OldButton
              text={isUploading ? 'Загрузка...' : 'Прикрепить файл'}
              variant="templateCardInternal"
              showArrow={false}
              icon={<PaperclipIcon width={24} height={24} />}
              disabled={!canAddMedia || isUploading}
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        ) : (
          <div className={styles.mediaDropzoneContent}>
            <MediaPreview
              files={files}
              onRemove={onRemove}
              onToggleBlur={onToggleBlur}
              onMove={onMove}
            />
            <OldButton
              text={isUploading ? 'Загрузка...' : 'Прикрепить ещё'}
              variant="templateCardInternal"
              showArrow={false}
              icon={<PaperclipIcon width={24} height={24} />}
              disabled={!canAddMedia || isUploading}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaSection;
