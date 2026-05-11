'use client';

import Modal from '@/components/modal/modal';
import { Button } from '@/components/new-button';
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
    ? `@${username} поделился (-лась) с Вами постом`
    : 'С Вами поделились постом';

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
            С вами поделились постом. Вы можете сразу перейти к публикации или сохранить его в свои черновики.
          </p>
          <div className={styles.buttons}>
            <Button
              className={styles.actionBtn}
              onClick={onSave}
            >
              Сохранить
            </Button>
            <Button
              intent="gradient"
              className={styles.actionBtn}
              onClick={onPublish}
            >
              Опубликовать
            </Button>
            <button className={styles.previewBtn} onClick={onPreview} aria-label="Предпросмотр">
              <EyeIcon width={16} height={16} color="#B0B4B8" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
