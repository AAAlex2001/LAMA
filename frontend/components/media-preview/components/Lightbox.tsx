import { MediaFile } from '../media-preview';
import CloseIcon from '@/components/icons/close-icon';
import Loader from '@/components/loader/loader';
import styles from '../media-preview.module.scss';

interface LightboxProps {
  media: MediaFile;
  url: string;
  loading: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

export default function Lightbox({ media, url, loading, onClose, onLoaded }: LightboxProps) {
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
