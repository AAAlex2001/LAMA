'use client';

import Modal from '@/components/modal/modal';
import EyeIcon from '@/components/icons/eye-icon';
import styles from './shared-draft-modal.module.scss';

interface SharedDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
}

export default function SharedDraftModal({
  isOpen,
  onClose,
  username,
  onSave,
  onPublish,
  onPreview,
}: SharedDraftModalProps) {
  const title = username
    ? `@${username} поделился (-лась) с Вами черновиком`
    : 'С Вами поделились черновиком';

  return (
    <div className={styles.wrapper}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onClose}
        title={title}
        hideButtons
      >
        <div className={styles.content}>
          <p className={styles.description}>
            Посмотрите, что внутри. Вы можете сразу перейти к публикации или сохранить его в свои черновики
          </p>
          <div className={styles.buttons}>
            <button className={styles.saveBtn} onClick={onSave}>
              Сохранить
            </button>
            <button className={styles.publishBtn} onClick={onPublish}>
              Опубликовать
            </button>
            <button className={styles.previewBtn} onClick={onPreview} title="Просмотр">
              <EyeIcon width={16} height={16} color="#B0B4B8" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
