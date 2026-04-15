'use client';

import styles from '../../drafts/drafts.module.scss';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useShareDraftLink } from '../../drafts/hooks/useShareDraftLink';
import Loader from '@/components/loader';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface SharePostModalProps {
  postId: number | null;
  onClose: () => void;
}

export default function SharePostModal({ postId, onClose }: SharePostModalProps) {
  const { showSuccess } = useNotifications();
  const shareTarget = postId ? ({ id: postId } as unknown as Parameters<typeof useShareDraftLink>[0]) : null;
  const { shareLink, isGeneratingShareLink } = useShareDraftLink(shareTarget);

  return (
    <div className={styles.shareModal}>
      <Modal
        isOpen={!!postId}
        onClose={onClose}
        onConfirm={onClose}
        title="Поделиться постом"
        hideButtons
      >
        <div className={styles.shareModalContent}>
          <p className={styles.shareDescription}>
            Вы можете скопировать ссылку и отправить её удобным способом или нажать на иконку Telegram, после чего выбрать чат и поделиться ссылкой напрямую.<br /><br />
            <strong>Внимание:</strong> ссылка действительна <strong>7 дней</strong> и может быть использована <strong>только один раз</strong>.
          </p>
          <div className={styles.shareLinkRow}>
            <div className={styles.shareLinkInput}>
              <Input
                value={shareLink}
                onChange={() => {}}
                variant="white"
                icon={<CopyIcon width={24} height={24} color="#000000" />}
                iconDisabled={isGeneratingShareLink || !shareLink}
                onIconClick={() => {
                  if (!isGeneratingShareLink && shareLink) {
                    navigator.clipboard.writeText(shareLink);
                    showSuccess('Ссылка скопирована!');
                  }
                }}
              />
              {isGeneratingShareLink && (
                <div className={styles.shareLinkLoader}>
                  <Loader size={16} color="blue" />
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.telegramBtn}
              onClick={() => {
                if (!isGeneratingShareLink && shareLink) {
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                }
              }}
              disabled={isGeneratingShareLink || !shareLink}
            >
              <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
