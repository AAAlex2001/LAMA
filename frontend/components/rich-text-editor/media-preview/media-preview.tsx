'use client';

import { useState } from 'react';
import styles from './media-preview.module.scss';
import BlurIcon from '@/components/icons/blur-icon';
import CloseIcon from '@/components/icons/close-icon';
import PlayIcon from '@/components/icons/play-icon';
import DocumentIcon from '@/components/icons/document-icon';
import Loader from '@/components/loader/loader';

export interface MediaFile {
  id: string;
  url: string;  // Source URL (для черновиков/готовых публикаций) или пусто для новых файлов
  preview_url?: string; // Сжатая превьюшка для UI (blob:...), генерится на клиенте
  thumbnail_url?: string | null; // URL готового thumbnail с бэкенда
  type: 'image' | 'video' | 'document';
  blur?: boolean;
  file?: File;  // Оригинальный File объект для загрузки на сервер
  telegram_file_id?: string | null; // Прогретый Telegram file_id (для черновиков/повторной отправки)
}

interface MediaPreviewProps {
  files: MediaFile[];
  onRemove: (id: string) => void;
  onToggleBlur: (id: string) => void;
}

export default function MediaPreview({ files, onRemove, onToggleBlur }: MediaPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaFile | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [lightboxLoading, setLightboxLoading] = useState(false);

  const openLightbox = (file: MediaFile) => {
    setLightboxMedia(file);
    setLightboxOpen(true);
    setLightboxLoading(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxMedia(null);
    setLightboxLoading(false);
  };

  const handleImageLoaded = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  // Получить лучший URL для превью
  const getPreviewUrl = (file: MediaFile): string => {
    return file.thumbnail_url || file.preview_url || file.url || '';
  };

  // Получить URL для полноразмерного просмотра
  const getFullUrl = (file: MediaFile): string => {
    return file.url || file.preview_url || file.thumbnail_url || '';
  };

  if (files.length === 0) return null;

  return (
    <>
      <div className={styles.mediaGrid}>
        {files.map((file) => (
          <div key={file.id} className={styles.mediaItem}>
            <div 
              className={styles.mediaContent}
              onClick={() => file.type !== 'document' && openLightbox(file)}
              style={{ cursor: file.type !== 'document' ? 'pointer' : 'default' }}
            >
              {file.type === 'document' ? (
            <div className={styles.documentIcon}>
              <DocumentIcon width={32} height={32} color="#CED2D6" />
            </div>
          ) : file.type === 'video' ? (
            <>
              {!loadedImages.has(file.id) && (
                <div className={styles.loaderOverlay}>
                  <Loader size={24} />
                </div>
              )}
              {getPreviewUrl(file) ? (
                <img
                  src={getPreviewUrl(file)}
                  alt="Video preview"
                  className={styles.mediaImage}
                  style={{ 
                    filter: file.blur ? 'blur(20px)' : 'none',
                    opacity: loadedImages.has(file.id) ? 1 : 0
                  }}
                  onLoad={() => handleImageLoaded(file.id)}
                  onError={() => handleImageLoaded(file.id)}
                />
              ) : (
                <div
                  className={styles.videoPlaceholder}
                  style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
                />
              )}
              <div className={styles.playIcon}>
                <PlayIcon width={24} height={24} color="#CED2D6" />
              </div>
            </>
          ) : (
            <>
              {!loadedImages.has(file.id) && (
                <div className={styles.loaderOverlay}>
                  <Loader size={24} />
                </div>
              )}
              <img 
                src={getPreviewUrl(file)} 
                alt="Media preview" 
                className={styles.mediaImage}
                style={{ 
                  filter: file.blur ? 'blur(20px)' : 'none',
                  opacity: loadedImages.has(file.id) ? 1 : 0
                }}
                onLoad={() => handleImageLoaded(file.id)}
                onError={() => handleImageLoaded(file.id)}
              />
            </>
          )}
            </div>
          
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

      {lightboxOpen && lightboxMedia && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={closeLightbox}>
              <CloseIcon width={24} height={24} color="#fff" />
            </button>
            
            {lightboxMedia.type === 'video' ? (
              <video
                src={getFullUrl(lightboxMedia)}
                controls
                autoPlay
                className={styles.lightboxMedia}
                onLoadedData={() => setLightboxLoading(false)}
              />
            ) : (
              <>
                {lightboxLoading && (
                  <div className={styles.lightboxLoader}>
                    <Loader size={48} color="white" />
                  </div>
                )}
                <img
                  src={getFullUrl(lightboxMedia)}
                  alt="Full size preview"
                  className={styles.lightboxMedia}
                  style={{ opacity: lightboxLoading ? 0 : 1 }}
                  onLoad={() => setLightboxLoading(false)}
                  onError={() => setLightboxLoading(false)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
