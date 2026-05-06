'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './AttachPostSourceModal.module.scss';

export type PostSource = 'calendar' | 'drafts';

interface AttachPostSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (source: PostSource) => void;
  initialSource?: PostSource;
}

const OPTIONS: { id: PostSource; label: string }[] = [
  { id: 'calendar', label: 'Календарь публикаций' },
  { id: 'drafts', label: 'Черновики' },
];

export default function AttachPostSourceModal({
  isOpen,
  onClose,
  onAttach,
  initialSource = 'calendar',
}: AttachPostSourceModalProps) {
  const [source, setSource] = useState<PostSource>(initialSource);

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="sm" padding="md" className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>Выберите источник поста</h3>
          <ModalBase.Close className={styles.close} />
        </div>
        <div className={styles.options}>
          {OPTIONS.map((opt) => (
            <label key={opt.id} className={styles.option}>
              <input
                type="radio"
                name="post-source"
                checked={source === opt.id}
                onChange={() => setSource(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          className={styles.attachBtn}
          onClick={() => {
            onAttach(source);
            onClose();
          }}
        >
          Прикрепить рекламный пост
        </Button>
      </ModalBase.Content>
    </ModalBase>
  );
}
