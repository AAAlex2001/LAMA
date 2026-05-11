'use client';

import Modal from '@/components/modal/modal';
import { Button } from '@/components/new-button';
import styles from '../../edit-draft.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpiredLinkModal({ isOpen, onClose }: Props) {
  return (
    <div className={styles.invalidLinkModal}>
      <Modal isOpen={isOpen} onClose={onClose} onConfirm={onClose} title="Ссылка недействительна" hideButtons>
        <div className={styles.shareModalContent}>
          <p className={styles.shareDescription}>
            Срок действия ссылки истёк или она уже была использована.
          </p>
          <div className={styles.shareLinkRow}>
            <Button onClick={() => { window.location.href = '/drafts'; }}>Список черновиков</Button>
            <Button
              intent="gradient"
              className={styles.invalidCreatePostBtn}
              onClick={() => { window.location.href = '/create-post'; }}
            >
              Создать пост
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
