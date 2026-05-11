'use client';

import classNames from 'classnames';
import { Button, type ButtonVariant, type ButtonIntent } from '../new-button';
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
  buttonsDirection?: 'row' | 'column';
  children?: React.ReactNode;
  hideButtons?: boolean;
}

const mapConfirmVariant = (
  variant: NonNullable<DeleteConfirmationModalProps['confirmVariant']>,
  active: boolean,
): { variant: ButtonVariant; intent: ButtonIntent } => {
  switch (variant) {
    case 'outlined-red':
      return { variant: 'outline', intent: 'destructive' };
    case 'templateCard':
    case 'inlineButton':
      return { variant: 'outline', intent: active ? 'gradient' : 'primary' };
    case 'default':
    default:
      return { variant: 'fill', intent: active ? 'gradient' : 'primary' };
  }
};

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
  confirmFirst = false,
  buttonsDirection = 'column',
  children,
  hideButtons = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const confirmStyle = mapConfirmVariant(confirmVariant, confirmActive);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {children}
          {!hideButtons && (
          <div
            className={classNames(styles.buttons, {
              [styles.buttonsRow]: buttonsDirection === 'row',
            })}
          >
            {confirmFirst && (
              <Button
                variant={confirmStyle.variant}
                intent={confirmStyle.intent}
                onClick={handleConfirm}
                style={{ width: '100%' }}
              >
                {confirmText}
              </Button>
            )}
            <Button
              variant="outline"
              intent="gradient"
              onClick={handleClose}
              style={{ width: '100%' }}
            >
              {cancelText}
            </Button>
            {!confirmFirst && (
              <Button
                variant={confirmStyle.variant}
                intent={confirmStyle.intent}
                onClick={handleConfirm}
                style={{ width: '100%' }}
              >
                {confirmText}
              </Button>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
