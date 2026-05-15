'use client';

import { useState } from 'react';
import { Button } from '@/components/new-button';
import Tooltip from '@/components/tooltip/tooltip';
import { ShareIcon } from '@/components/icons';
import styles from '../edit-draft.module.scss';

interface Props {
  isSavingDraft: boolean;
  isPublishing: boolean;
  isLastSeriesPost: boolean;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onShare: () => void;
}

export default function EditDraftFooter({
  isSavingDraft,
  isPublishing,
  isLastSeriesPost,
  onSave,
  onPublish,
  onSchedule,
  onShare,
}: Props) {
  const [hoveredShareBtn, setHoveredShareBtn] = useState(false);

  return (
    <div className={styles.footerButtons}>
      {isLastSeriesPost && (
        <Button
          variant="outline"
          intent="gradient"
          className={styles.saveBtn}
          onClick={onSave}
          loading={isSavingDraft}
          disabled={isSavingDraft}
        >
          Сохранить изменения
        </Button>
      )}
      <button
        type="button"
        className={styles.shareBtn}
        aria-label="Поделиться"
        onClick={onShare}
        onMouseEnter={() => setHoveredShareBtn(true)}
        onMouseLeave={() => setHoveredShareBtn(false)}
      >
        <ShareIcon width={24} height={24} color="#B0B4B8" />
        {hoveredShareBtn && <Tooltip text="Поделиться" />}
      </button>
      <div className={styles.rightButtons}>
        <button
          type="button"
          className={styles.shareBtnDesktop}
          aria-label="Поделиться"
          onClick={onShare}
          onMouseEnter={() => setHoveredShareBtn(true)}
          onMouseLeave={() => setHoveredShareBtn(false)}
        >
          <ShareIcon width={24} height={24} color="#B0B4B8" />
          {hoveredShareBtn && <Tooltip text="Поделиться" />}
        </button>
        {isLastSeriesPost && (
          <Button
            variant="outline"
            intent="gradient"
            size="lg"
            className={styles.publishBtn}
            onClick={onPublish}
            loading={isPublishing}
            disabled={isPublishing}
          >
            Опубликовать сейчас
          </Button>
        )}
        <Button
          intent="gradient"
          className={styles.scheduleBtn}
          onClick={onSchedule}
        >
          Запланировать
        </Button>
      </div>
    </div>
  );
}
