'use client';

import { useState, useEffect } from 'react';
import Button from '../button/button';
import styles from './modal.module.scss';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'templateCard' | 'inlineButton' | 'outlined-red';
  confirmActive?: boolean;
  cancelActive?: boolean;
  confirmFirst?: boolean;
  children?: React.ReactNode;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Удалить',
  cancelText = 'Отменить',
  confirmVariant = 'outlined-red',
  confirmActive = false,
  cancelActive = true,
  confirmFirst = false,
  children,
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
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {children}
          <div className={styles.buttons}>
            {confirmFirst && (
              <Button
                text={confirmText}
                variant={confirmVariant}
                onClick={handleConfirm}
                showArrow={false}
                fullWidth
                active={confirmActive}
                hovered={hoveredDelete}
                onMouseEnter={() => setHoveredDelete(true)}
                onMouseLeave={() => setHoveredDelete(false)}
              />
            )}
            <Button
              text={cancelText}
              onClick={handleClose}
              showArrow={false}
              fullWidth
              active={cancelActive}
            />
            {!confirmFirst && (
              <Button
                text={confirmText}
                variant={confirmVariant}
                onClick={handleConfirm}
                showArrow={false}
                fullWidth
                active={confirmActive}
                hovered={hoveredDelete}
                onMouseEnter={() => setHoveredDelete(true)}
                onMouseLeave={() => setHoveredDelete(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
