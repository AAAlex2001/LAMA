import DocumentIcon from '@/components/icons/document-icon';
import styles from '../media-preview.module.scss';

export default function DocumentPreview() {
  return (
    <div className={styles.documentIcon}>
      <DocumentIcon width={32} height={32} color="#CED2D6" />
    </div>
  );
}
