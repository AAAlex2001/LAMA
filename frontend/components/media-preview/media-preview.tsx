'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './media-preview.module.scss';
import BlurIcon from '@/components/icons/blur-icon';
import CloseIcon from '@/components/icons/close-icon';
import PlayIcon from '@/components/icons/play-icon';
import DocumentIcon from '@/components/icons/document-icon';
import Loader from '@/components/loader/loader';

export interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'document';
  file?: File;
  url?: string;
  preview_url?: string;
  thumbnail_url?: string;
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaFile | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string>('');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (files.length === 0) return null;

  const getPreviewUrl = (file: MediaFile): string => {
    if (file.type === 'video') {
      return file.thumbnail_url || '';
    }
    return file.thumbnail_url || file.preview_url || file.url || '';
  };

  const openLightbox = (file: MediaFile) => {
    let fullUrl = '';
    if (file.file) {
      fullUrl = URL.createObjectURL(file.file);
    } else {
      fullUrl = file.url || file.preview_url || file.thumbnail_url || '';
    }

    if (!fullUrl) return;

    setLightboxMedia(file);
    setLightboxUrl(fullUrl);
    setLightboxOpen(true);
    setLightboxLoading(true);
  };

  const closeLightbox = () => {
    if (lightboxMedia?.file && lightboxUrl.startsWith('blob:')) {
      URL.revokeObjectURL(lightboxUrl);
    }
    setLightboxOpen(false);
    setLightboxMedia(null);
    setLightboxUrl('');
    setLightboxLoading(false);
  };

  const handleImageLoaded = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fileId);
    setDraggingId(fileId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    if (dragOverId !== fileId) {
      setDragOverId(fileId);
    }
  };

  const handleDragLeave = (fileId: string) => {
    if (dragOverId === fileId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) {
      onMove(sourceId, targetId);
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <>
      <div className={styles.mediaGrid}>
        {files.map(file => (
          <div
            key={file.id}
            className={`
              ${styles.mediaItem}
              ${draggingId === file.id ? styles.dragging : ''}
              ${dragOverId === file.id ? styles.dragOver : ''}
            `}
            draggable
            onDragStart={e => handleDragStart(e, file.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, file.id)}
            onDragLeave={() => handleDragLeave(file.id)}
            onDrop={e => handleDrop(e, file.id)}
          >
            {/* Превью медиа */}
            <div
              className={styles.mediaContent}
              onClick={() => file.type !== 'document' && openLightbox(file)}
              style={{ cursor: file.type !== 'document' ? 'pointer' : 'default' }}
            >
              {file.type === 'document' ? (
                <DocumentPreview />
              ) : file.type === 'video' ? (
                <VideoPreview
                  file={file}
                  previewUrl={getPreviewUrl(file)}
                  isLoaded={loadedImages.has(file.id)}
                  onLoad={() => handleImageLoaded(file.id)}
                />
              ) : (
                <ImagePreview
                  file={file}
                  previewUrl={getPreviewUrl(file)}
                  isLoaded={loadedImages.has(file.id)}
                  onLoad={() => handleImageLoaded(file.id)}
                />
              )}
            </div>

            {/* Кнопки управления */}
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

      {/* Лайтбокс */}
      {lightboxOpen && lightboxMedia && lightboxUrl && (
        <Lightbox
          media={lightboxMedia}
          url={lightboxUrl}
          loading={lightboxLoading}
          onClose={closeLightbox}
          onLoaded={() => setLightboxLoading(false)}
        />
      )}
    </>
  );
}

function DocumentPreview() {
  return (
    <div className={styles.documentIcon}>
      <DocumentIcon width={32} height={32} color="#CED2D6" />
    </div>
  );
}

interface ImagePreviewProps {
  file: MediaFile;
  previewUrl: string;
  isLoaded: boolean;
  onLoad: () => void;
}

function ImagePreview({ file, previewUrl, isLoaded, onLoad }: ImagePreviewProps) {
  return (
    <>
      {!isLoaded && (
        <div className={styles.loaderOverlay}>
          <Loader size={24} />
        </div>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Media preview"
          className={styles.mediaImage}
          style={{
            filter: file.blur ? 'blur(20px)' : 'none',
            opacity: isLoaded ? 1 : 0,
          }}
          onLoad={onLoad}
          onError={onLoad}
        />
      ) : (
        <div
          className={styles.videoPlaceholder}
          style={{ filter: file.blur ? 'blur(20px)' : 'none' }}
        />
      )}
    </>
  );
}

interface VideoPreviewProps {
  file: MediaFile;
  previewUrl: string;
  isLoaded: boolean;
  onLoad: () => void;
}

function VideoPreview({ file, previewUrl, isLoaded, onLoad }: VideoPreviewProps) {
  const videoSrc = useMemo(() => {
    if (file.file) return URL.createObjectURL(file.file);
    return file.url || file.preview_url || '';
  }, [file.file, file.url, file.preview_url]);

  useEffect(() => {
    return () => {
      if (videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  return (
    <>
      {!isLoaded && (
        <div className={styles.loaderOverlay}>
          <Loader size={24} />
        </div>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Video preview"
          className={styles.mediaImage}
          style={{
            filter: file.blur ? 'blur(20px)' : 'none',
            opacity: isLoaded ? 1 : 0,
          }}
          onLoad={onLoad}
          onError={onLoad}
        />
      ) : videoSrc ? (
        <video
          src={videoSrc}
          className={styles.mediaImage}
          preload="metadata"
          muted
          playsInline
          style={{
            filter: file.blur ? 'blur(20px)' : 'none',
            opacity: isLoaded ? 1 : 0,
          }}
          onLoadedData={onLoad}
          onError={onLoad}
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
  );
}

interface LightboxProps {
  media: MediaFile;
  url: string;
  loading: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

function Lightbox({ media, url, loading, onClose, onLoaded }: LightboxProps) {
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
        <button className={styles.lightboxClose} onClick={onClose}>
          <CloseIcon width={24} height={24} color="#fff" />
        </button>

        {media.type === 'video' ? (
          <video
            src={url}
            controls
            autoPlay
            className={styles.lightboxMedia}
            onLoadedData={onLoaded}
          />
        ) : (
          <>
            {loading && (
              <div className={styles.lightboxLoader}>
                <Loader size={48} color="white" />
              </div>
            )}
            <img
              src={url}
              alt="Full size preview"
              className={styles.lightboxMedia}
              style={{ opacity: loading ? 0 : 1 }}
              onLoad={onLoaded}
              onError={onLoaded}
            />
          </>
        )}
      </div>
    </div>
  );
}
