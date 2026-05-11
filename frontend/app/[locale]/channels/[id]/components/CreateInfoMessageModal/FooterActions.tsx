'use client';

import { FC } from 'react';
import { Button } from '@/components/new-button';
import { EyeIcon, ShareIcon } from '@/components/icons';
import type { SavingType } from './helpers';
import styles from '../CreateInfoMessageModal.module.scss';

interface FooterActionsProps {
  savingType: SavingType;
  isEditing: boolean;
  hasShareableContent: boolean;
  onPreview: () => void;
  onShare: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSchedule: () => void;
}

const FooterActions: FC<FooterActionsProps> = ({
  savingType,
  isEditing,
  hasShareableContent,
  onPreview,
  onShare,
  onSaveDraft,
  onPublish,
  onSchedule,
}) => {
  return (
    <div className={styles.footer}>
      <div className={styles.footerTopRow}>
        <Button
          variant="ghost"
          intent="neutral"
          size="sm"
          className={styles.iconBtn}
          onClick={onPreview}
        >
          <EyeIcon width={16} height={16} />
        </Button>
        <Button
          variant="ghost"
          intent="neutral"
          size="sm"
          className={styles.shareBtn}
          onClick={onShare}
          disabled={!hasShareableContent}
        >
          <ShareIcon width={24} height={24} />
        </Button>
        <Button
          variant="outline"
          intent="gradient"
          size="lg"
          className={styles.draftBtn}
          onClick={onSaveDraft}
          loading={savingType === 'draft'}
          disabled={savingType !== null}
        >
          {isEditing ? 'Сохранить' : 'Сохранить в черновики'}
        </Button>
      </div>
      <div className={styles.footerBottomRow}>
        <Button
          variant="outline"
          intent="gradient"
          size="lg"
          className={styles.publishNowBtn}
          onClick={onPublish}
          loading={savingType === 'publish'}
          disabled={savingType !== null}
        >
          Опубликовать сейчас
        </Button>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          className={styles.scheduleBtn}
          onClick={onSchedule}
          loading={savingType === 'schedule'}
          disabled={savingType !== null}
        >
          Запланировать
        </Button>
      </div>
    </div>
  );
};

export default FooterActions;
