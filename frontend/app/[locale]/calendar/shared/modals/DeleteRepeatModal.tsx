'use client';

import Modal from '@/components/modal';
import { Button } from '@/components/new-button';
import styles from '../../calendar.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'this' | 'this_and_following') => void;
}

export default function DeleteRepeatModal({ isOpen, onClose, onConfirm }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} onConfirm={() => {}} title="Удаление повтора" hideButtons>
      <div className={styles.repeatDeleteButtons}>
        <Button
          variant="outline"
          intent="destructive"
          onClick={() => onConfirm('this')}
          style={{ width: '100%' }}
        >
          Удалить этот пост
        </Button>
        <Button
          variant="outline"
          intent="destructive"
          onClick={() => onConfirm('this_and_following')}
          style={{ width: '100%' }}
        >
          Удалить этот и следующие
        </Button>
        <Button onClick={onClose} intent="gradient" style={{ width: '100%' }}>Отмена</Button>
      </div>
    </Modal>
  );
}
