'use client';

import Modal from '@/components/modal';
import Input from '@/components/input/input';
import Loader from '@/components/loader';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Draft } from '@/types/post';
import { useShareDraftLink } from '../../hooks/useShareDraftLink';
import styles from '../../drafts.module.scss';

interface Props {
  draft: Draft | null;
  onClose: () => void;
}

export default function ShareDraftLinkModal({ draft, onClose }: Props) {
  const { showSuccess } = useNotifications();
  const { shareLink, isGeneratingShareLink } = useShareDraftLink(draft);

  const ready = !isGeneratingShareLink && shareLink;

  function copy() {
    if (!ready) return;
    navigator.clipboard.writeText(shareLink);
    showSuccess('Ссылка скопирована!');
  }

  function shareToTelegram() {
    if (!ready) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
  }

  return (
    <div className={styles.shareModal}>
      <Modal isOpen={!!draft} onClose={onClose} onConfirm={onClose} title="Поделиться черновиком" hideButtons>
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
                onIconClick={copy}
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
              onClick={shareToTelegram}
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
