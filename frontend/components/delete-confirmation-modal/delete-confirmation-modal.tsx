'use client';

import { useState } from 'react';
import Button from '../button/button';
import styles from './delete-confirmation-modal.module.scss';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
}: DeleteConfirmationModalProps) {
  const [hoveredDelete, setHoveredDelete] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        
        <div className={styles.buttons}>
          <Button
            text="Удалить"
            variant="outlined-red"
            onClick={handleConfirm}
            showArrow={false}
            fullWidth
            hovered={hoveredDelete}
            onMouseEnter={() => setHoveredDelete(true)}
            onMouseLeave={() => setHoveredDelete(false)}
          />
          
          <Button
            text="Отменить"
            onClick={onClose}
            showArrow={false}
            fullWidth
            active
          />
        </div>
      </div>
    </div>
  );
}
