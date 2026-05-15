'use client';

import ModalBase from '@/components/modal-base';
import { LinkIcon } from '@/components/icons';
import type { AdPlacement } from './AdCard';
import styles from './PlacementsModal.module.scss';

interface PlacementsModalProps {
  placements: AdPlacement[];
  onClose: () => void;
}

export default function PlacementsModal({ placements, onClose }: PlacementsModalProps) {
  return (
    <ModalBase isOpen onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="lg" padding="md" className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>Все публикации</h2>
          <div className={styles.list}>
            {placements.map((p, idx) => (
              <PlacementRow key={`${p.channelId}-${idx}`} placement={p} />
            ))}
          </div>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
}

function PlacementRow({ placement }: { placement: AdPlacement }) {
  const handle = placement.username ? `@${placement.username.replace(/^@/, '')}` : '';
  const link = placement.postLink;
  const titleText = placement.title || handle || '—';

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.communityTitle}>{titleText}</span>
        {handle && <span className={styles.communityHandle}>{handle}</span>}
      </div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть пост"
          className={styles.linkBtn}
        >
          <LinkIcon width={16} height={16} color="#3B82F6" />
          <span>Открыть</span>
        </a>
      ) : (
        <span className={styles.linkDisabled}>Нет ссылки</span>
      )}
    </div>
  );
}
