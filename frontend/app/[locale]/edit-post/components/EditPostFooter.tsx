'use client';

import { useState } from 'react';
import styles from '../edit-post.module.scss';
import { Button } from '@/components/new-button';
import { ShareIcon, TrashIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';

interface EditPostFooterProps {
  seriesId: number | null;
  activePostId: number | null;
  isSaving: boolean;
  onSave: () => void;
  onMoveToDraft: () => void;
  onDeleteFromSeries: () => void;
  onShare: () => void;
}

export default function EditPostFooter({
  seriesId,
  activePostId,
  isSaving,
  onSave,
  onMoveToDraft,
  onDeleteFromSeries,
  onShare,
}: EditPostFooterProps) {
  const [hoveredShareBtn, setHoveredShareBtn] = useState(false);

  return (
    <div className={styles.footerButtons}>
      {seriesId && (
        <Button
          variant="fill"
          intent="destructive"
          className={styles.deleteSeriesBtn}
          onClick={onDeleteFromSeries}
        >
          <TrashIcon width={15} height={16.67} />
          Удалить из серии
        </Button>
      )}
      <Button
        variant="outline"
        intent="primary"
        className={styles.moveToDraftBtn}
        onClick={onMoveToDraft}
      >
        Перенести в черновик
      </Button>
      <div className={styles.rightButtons}>
        <button
          type="button"
          className={styles.shareBtn}
          aria-label="Поделиться"
          onMouseEnter={() => setHoveredShareBtn(true)}
          onMouseLeave={() => setHoveredShareBtn(false)}
          onClick={onShare}
          disabled={!activePostId}
        >
          <ShareIcon width={24} height={24} color="#B0B4B8" />
          {hoveredShareBtn && <Tooltip text="Поделиться" />}
        </button>
        <Button
          intent="gradient"
          className={styles.saveBtn}
          onClick={onSave}
          loading={isSaving}
          disabled={isSaving}
        >
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
