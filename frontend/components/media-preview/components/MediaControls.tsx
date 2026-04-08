import BlurIcon from '@/components/icons/blur-icon';
import CloseIcon from '@/components/icons/close-icon';
import styles from '../media-preview.module.scss';

interface MediaControlsProps {
  blur: boolean;
  onToggleBlur: () => void;
  onRemove: () => void;
}

export default function MediaControls({ blur, onToggleBlur, onRemove }: MediaControlsProps) {
  return (
    <div className={styles.mediaControls} data-controls>
      <button
        className={`${styles.controlButton} ${blur ? styles.active : ''}`}
        onClick={onToggleBlur}
        aria-label="Размыть медиа"
        type="button"
      >
        <BlurIcon width={16} height={16} color="#000000" />
      </button>

      <button
        className={styles.controlButton}
        onClick={onRemove}
        aria-label="Удалить медиа"
        type="button"
      >
        <CloseIcon width={16} height={16} color="#000000" />
      </button>
    </div>
  );
}
