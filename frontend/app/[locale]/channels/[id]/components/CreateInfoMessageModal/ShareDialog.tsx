'use client';

import { FC } from 'react';
import Modal from '@/components/modal/modal';
import Input from '@/components/input';
import Loader from '@/components/loader';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import styles from '../CreateInfoMessageModal.module.scss';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: string;
  isGenerating: boolean;
}

const ShareDialog: FC<ShareDialogProps> = ({ isOpen, onClose, shareLink, isGenerating }) => {
  const { showSuccess } = useNotifications();
  const disabled = isGenerating || !shareLink;

  return (
    <div className={styles.shareModal}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onClose}
        title="Поделиться сообщением"
        hideButtons
      >
        <div className={styles.shareModalContent}>
          <p className={styles.shareDescription}>
            Скопируйте ссылку и отправьте её удобным способом или нажмите на иконку Telegram.
          </p>
          <div className={styles.shareLinkRow}>
            <div className={styles.shareLinkInput}>
              <Input
                value={shareLink}
                onChange={() => {}}
                variant="white"
                icon={<CopyIcon width={24} height={24} color="#000000" />}
                iconDisabled={disabled}
                onIconClick={() => {
                  if (!disabled) {
                    navigator.clipboard.writeText(shareLink);
                    showSuccess('Ссылка скопирована!');
                  }
                }}
              />
              {isGenerating && (
                <div className={styles.shareLinkLoader}>
                  <Loader size={16} color="blue" />
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.telegramBtn}
              onClick={() => {
                if (!disabled) {
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                }
              }}
              disabled={disabled}
            >
              <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShareDialog;
