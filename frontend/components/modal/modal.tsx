'use client';

import { useState, useEffect } from 'react';
import Button from '../button/button';
import styles from './modal.module.scss';

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

  useEffect(() => {
    if (!isOpen) {
      setHoveredDelete(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setHoveredDelete(false);
    onConfirm();
    onClose();
  };

  const handleClose = () => {
    setHoveredDelete(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
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
            onClick={handleClose}
            showArrow={false}
            fullWidth
            active
          />
        </div>
      </div>
    </div>
  );
}
