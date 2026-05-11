'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { Button } from '@/components/new-button';
import styles from '../../drafts.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpiredLinkModal({ isOpen, onClose }: Props) {
  const router = useRouter();

  return (
    <div className={styles.invalidLinkModal}>
      <Modal isOpen={isOpen} onClose={onClose} onConfirm={onClose} title="Ссылка недействительна" hideButtons>
        <div className={styles.shareModalContent}>
          <p className={styles.shareDescription}>
            Срок действия ссылки истёк или она уже была использована.
          </p>
          <div className={styles.shareLinkRow}>
            <Button
              onClick={() => { onClose(); router.push('/drafts'); }}
            >
              Список черновиков
            </Button>
            <Button
              intent="gradient"
              className={styles.invalidCreatePostBtn}
              onClick={() => { onClose(); router.push('/create-post'); }}
            >
              Создать пост
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
