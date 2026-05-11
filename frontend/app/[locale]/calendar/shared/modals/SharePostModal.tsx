'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import Loader from '@/components/loader';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useShareDraftLinkMutation } from '@/store/publications/queries';
import styles from '../../calendar.module.scss';

interface Props {
  postId: number | null;
  onClose: () => void;
}

export default function SharePostModal({ postId, onClose }: Props) {
  const { showSuccess, showError } = useNotifications();
  const mutation = useShareDraftLinkMutation();
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (postId === null) {
      setShareLink('');
      mutation.reset();
      return;
    }
    mutation
      .mutateAsync(postId)
      .then(({ share_token }) => {
        setShareLink(`${window.location.origin}/drafts?token=${share_token}`);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : 'Ошибка шаринга');
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const ready = !mutation.isPending && shareLink;

  return (
    <div className={styles.shareModal}>
      <Modal
        isOpen={postId !== null}
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
                iconDisabled={!ready}
                onIconClick={() => {
                  if (!ready) return;
                  navigator.clipboard.writeText(shareLink);
                  showSuccess('Ссылка скопирована!');
                }}
              />
              {mutation.isPending && (
                <div className={styles.shareLinkLoader}>
                  <Loader size={16} color="blue" />
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.telegramBtn}
              onClick={() => {
                if (!ready) return;
                window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
              }}
              disabled={!ready}
            >
              <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
