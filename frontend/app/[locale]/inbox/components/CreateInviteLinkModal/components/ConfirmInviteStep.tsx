'use client';

import React from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from '../styles.module.scss';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { InviteLinkData } from '../index';
import { ChannelBasic } from '@/types';
import { deleteInviteLinkThunk } from '../../../store/thunks/inviteLinks';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface ConfirmInviteStepProps {
  previewData: InviteLinkData;
  selectedChannel: ChannelBasic | undefined;
  onBack: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  onClose?: () => void;
  isEditing?: boolean;
  isLoading: boolean;
}

const ConfirmInviteStep: React.FC<ConfirmInviteStepProps> = ({
  previewData,
  selectedChannel,
  onBack,
  onConfirm,
  onEdit,
  onClose,
  isEditing,
  isLoading
}) => {
  const dispatch = useAppDispatch();
  const modalState = useAppSelector((state) => state.createInviteLinkModal);
  const { showSuccess, showError } = useNotifications();
  const formatValidity = () => {
    if (previewData.validityPeriod === 'indefinite') return 'Бессрочно';
    if (!previewData.expirationDate) return '';

    const date = new Date(previewData.expirationDate);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(previewData.expirationHours ?? 0).padStart(2, '0');
    const min = String(previewData.expirationMinutes ?? 0).padStart(2, '0');

    return `до ${dd}.${mm}.${yy} ${hh}:${min}`;
  };

  const formatMethod = () => {
    return previewData.loginMethod === 'bot' ? 'Через приветственного бота' : 'Прямая ссылка';
  };

  const handleDelete = async () => {
    if (!modalState.editingLinkId) return;
    
    try {
      await dispatch(deleteInviteLinkThunk({ 
        channelId: Number(previewData.channelId), 
        linkId: Number(modalState.editingLinkId) 
      })).unwrap();
      
      showSuccess('Ссылка-приглашение успешно удалена');
      onClose?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить ссылку-приглашение';
      showError(errorMessage);
    }
  };

  const handleEdit = () => {
    onEdit?.();
  };

  return (
    <>
      <ModalBase.Body className={styles.modalBody}>
        <div className={styles.confirmDetailsList}>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Канал:</span>
            <span className={styles.confirmDetailValue}>
              {selectedChannel?.title || '—'}
            </span>
          </div>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Название ссылки:</span>
            <span className={styles.confirmDetailValue}>
              {previewData.linkName || '—'}
            </span>
          </div>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Тип ссылки:</span>
            <span className={styles.confirmDetailValue}>
              {previewData.linkType === 'open' ? 'Открытая' : 'Закрытая'}
            </span>
          </div>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Срок:</span>
            <span className={styles.confirmDetailValue}>{formatValidity()}</span>
          </div>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Способ:</span>
            <span className={styles.confirmDetailValue}>{formatMethod()}</span>
          </div>
          <div className={styles.confirmDetailRow}>
            <span className={styles.confirmDetailLabel}>Капча:</span>
            <span className={styles.confirmDetailValue}>{previewData.hasCaptcha ? (`включена`) : (`выключена`)}</span>
          </div>
        </div>
      </ModalBase.Body>
      <ModalBase.Footer className={styles.confirmFooter}>
        <Button
          variant="outline"
          intent="gradient"
          size="lg"
          onClick={isEditing ? handleDelete : onBack}
          className={styles.confirmBackButton}
        >
          <span className={buttonStyles.label}>{isEditing ? 'Удалить' : 'Назад'}</span>
        </Button>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={isEditing ? handleEdit : onConfirm}
          className={styles.confirmSubmitButton}
          disabled={isLoading}
          loading={isLoading}
        >
          <span className={buttonStyles.label}>{isEditing ? 'Редактировать' : 'Создать'}</span>
        </Button>
      </ModalBase.Footer>
    </>
  );
};

export default ConfirmInviteStep;
