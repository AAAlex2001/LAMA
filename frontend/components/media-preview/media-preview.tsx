'use client';

import { useState } from 'react';
import styles from './media-preview.module.scss';
import BlurIcon from '@/components/icons/blur-icon';
import CloseIcon from '@/components/icons/close-icon';
import PlayIcon from '@/components/icons/play-icon';
import DocumentIcon from '@/components/icons/document-icon';
import Loader from '@/components/loader/loader';
import { useMediaPreview, type MediaFile } from './MediaPreviewContext';

export default function MediaPreview() {
  const { files, removeFile, toggleBlur, moveFile } = useMediaPreview();
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaFile | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string>('');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  const getPreviewUrl = (file: MediaFile): string => {
    return file.thumbnail_url || file.preview_url || file.url || '';
  };

  if (files.length === 0) return null;

  return (
    <>
      <div className={styles.mediaGrid}>
        {files.map((file) => (
          <div
            key={file.id}
            className={`${styles.mediaItem} ${draggingId === file.id ? styles.dragging : ''} ${dragOverId === file.id ? styles.dragOver : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', file.id);
              setDraggingId(file.id);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== file.id) setDragOverId(file.id);
            }}
            onDragLeave={() => {
              if (dragOverId === file.id) setDragOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const sourceId = e.dataTransfer.getData('text/plain');
              if (sourceId) {
                moveFile(sourceId, file.id);
              }
              setDraggingId(null);
              setDragOverId(null);
            }}
          >
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
                  {getPreviewUrl(file) ? (
                    <img
                      src={getPreviewUrl(file)}
                      alt="Media preview"
                      className={styles.mediaImage}
                      style={{
                        filter: file.blur ? 'blur(20px)' : 'none',
                        opacity: loadedImages.has(file.id) ? 1 : 0,
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
                </>
              )}
            </div>
          
            <div className={styles.mediaControls}>
              <button
                className={`${styles.controlButton} ${file.blur ? styles.active : ''}`}
                onClick={() => toggleBlur(file.id)}
                aria-label="Размыть медиа"
                type="button"
              >
                <BlurIcon width={16} height={16} color="#383F45" />
              </button>
              
              <button
                className={styles.controlButton}
                onClick={() => removeFile(file.id)}
                aria-label="Удалить медиа"
                type="button"
              >
                <CloseIcon width={16} height={16} color="#383F45" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && lightboxMedia && lightboxUrl && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={closeLightbox}>
              <CloseIcon width={24} height={24} color="#fff" />
            </button>
            
            {lightboxMedia.type === 'video' ? (
              <video
                src={lightboxUrl}
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
                  src={lightboxUrl}
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
