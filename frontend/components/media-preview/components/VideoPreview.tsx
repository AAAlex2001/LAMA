import { useEffect, useMemo } from 'react';
import { MediaFile } from '../media-preview';
import Loader from '@/components/loader/loader';
import PlayIcon from '@/components/icons/play-icon';
import styles from '../media-preview.module.scss';

interface VideoPreviewProps {
  file: MediaFile;
  previewUrl: string;
  isLoaded: boolean;
  onLoad: () => void;
}

export default function VideoPreview({ file, previewUrl, isLoaded, onLoad }: VideoPreviewProps) {
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
