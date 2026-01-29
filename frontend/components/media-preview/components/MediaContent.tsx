import { MediaFile } from '../media-preview';
import DocumentPreview from './DocumentPreview';
import ImagePreview from './ImagePreview';
import VideoPreview from './VideoPreview';
import styles from '../media-preview.module.scss';

interface MediaContentProps {
  file: MediaFile;
  previewUrl: string;
  isLoaded: boolean;
  onLoad: () => void;
}

export default function MediaContent({ file, previewUrl, isLoaded, onLoad }: MediaContentProps) {
  return (
    <div className={styles.mediaContent}>
      {file.type === 'document' ? (
        <DocumentPreview />
      ) : file.type === 'video' ? (
        <VideoPreview
          file={file}
          previewUrl={previewUrl}
          isLoaded={isLoaded}
          onLoad={onLoad}
        />
      ) : (
        <ImagePreview
          file={file}
          previewUrl={previewUrl}
          isLoaded={isLoaded}
          onLoad={onLoad}
        />
      )}
    </div>
  );
}
