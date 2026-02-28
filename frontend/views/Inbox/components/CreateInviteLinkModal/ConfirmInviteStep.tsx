'use client';

import React from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { InviteLinkData, Channel } from './index';
import { InvitationLink } from '../LinkInvitesModal';

interface ConfirmInviteStepProps {
  previewData: InviteLinkData;
  selectedChannel: Channel | undefined;
  onBack: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  editingIvite?: InvitationLink | null;
}

const ConfirmInviteStep: React.FC<ConfirmInviteStepProps> = ({
  previewData,
  selectedChannel,
  onBack,
  onConfirm,
  onEdit,
  editingIvite,
}) => {
  const formatValidity = () => {
    if (previewData.validityPeriod === 'indefinite') return 'Бессрочно';
    if (!previewData.expirationDate) return '';

    const date = previewData.expirationDate;
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

  const handleDelete = () => {
    //onDelete?.(editingIvite);
    console.log('deleted');
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
              {selectedChannel?.name || '—'}
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
          {editingIvite && editingIvite.verifiedCount !== undefined && (
            <div className={styles.confirmDetailRow}>
              <span className={styles.confirmDetailLabel}>Кол-во одобренных:</span>
              <span className={styles.confirmDetailValue}>{editingIvite.verifiedCount}</span>
            </div>
          )}
          {editingIvite && editingIvite.creationDate && (
            <div className={styles.confirmDetailRow}>
              <span className={styles.confirmDetailLabel}>Дата создания:</span>
              <span className={styles.confirmDetailValue}>{editingIvite.creationDate}</span>
            </div>
          )}
        </div>
      </ModalBase.Body>
      <ModalBase.Footer className={styles.confirmFooter}>
        <Button
          variant="outline"
          intent="gradient"
          size="lg"
          onClick={editingIvite ? handleDelete : onBack}
          className={styles.confirmBackButton}
        >
          <span className={buttonStyles.label}>{editingIvite ? 'Удалить' : 'Назад'}</span>
        </Button>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={editingIvite ? handleEdit : onConfirm}
          className={styles.confirmSubmitButton}
        >
          <span className={buttonStyles.label}>{editingIvite ? 'Редактировать' : 'Создать'}</span>
        </Button>
      </ModalBase.Footer>
    </>
  );
};

export default ConfirmInviteStep;
