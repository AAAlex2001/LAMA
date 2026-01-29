import { MediaFile } from '../media-preview';
import Loader from '@/components/loader/loader';
import styles from '../media-preview.module.scss';

interface ImagePreviewProps {
  file: MediaFile;
  previewUrl: string;
  isLoaded: boolean;
  onLoad: () => void;
}

export default function ImagePreview({ file, previewUrl, isLoaded, onLoad }: ImagePreviewProps) {
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
