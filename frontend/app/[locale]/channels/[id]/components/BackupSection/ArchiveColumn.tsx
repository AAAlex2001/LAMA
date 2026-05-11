'use client';

import { FC, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { Button } from '@/components/new-button';
import type { Channel } from '@/types/channel';
import styles from '../BackupSection.module.scss';

interface ArchiveColumnProps {
  saveArchive: boolean;
  onToggleSaveArchive: (next: boolean) => void;
  channels: Channel[];
  restoreTargetId: number | null;
  onRestoreTargetChange: (id: number) => void;
  onRestoreClick: () => void;
  onExportClick: () => void;
  saving: boolean;
}

const ArchiveColumn: FC<ArchiveColumnProps> = ({
  saveArchive,
  onToggleSaveArchive,
  channels,
  restoreTargetId,
  onRestoreTargetChange,
  onRestoreClick,
  onExportClick,
  saving,
}) => {
  const [restoreOpen, setRestoreOpen] = useState(false);

  const restoreTargetName = channels.find((ch) => ch.id === restoreTargetId)?.title ?? '';

  return (
    <div className={styles.column}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Сохранять архив в системе LamaPlanner</span>
        <Toggle checked={saveArchive} onChange={onToggleSaveArchive} disabled={saving} />
      </div>

      {saveArchive && (
        <div className={styles.archiveContent}>
          <div className={styles.archiveBlock}>
            <div className={styles.archiveHeader}>
              <span className={styles.archiveTitle}>Восстановление данных</span>
              <span className={styles.archiveDesc}>Все сохранённые посты будут скопированы в выбранный канал</span>
            </div>
            <Button
              variant="outline"
              intent="gradient"
              size="md"
              className={styles.archiveBtn}
              onClick={onRestoreClick}
              disabled={saving || !restoreTargetId}
            >
              Восстановить данные
            </Button>
          </div>

          <button
            className={styles.channelSelectorRow}
            type="button"
            onClick={() => setRestoreOpen(!restoreOpen)}
          >
            <span className={styles.subLabel}>Канал для восстановления:</span>
            <span className={styles.channelSelectorValue}>{restoreTargetName || 'Не выбран'}</span>
            <ChevronDownIcon
              width={16}
              height={16}
              color="#000000"
              className={`${styles.subChevron} ${restoreOpen ? styles.subChevronOpen : ''}`}
            />
          </button>

          {restoreOpen && (
            <div className={styles.channelPicker}>
              <div className={styles.channelList}>
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    className={styles.channelItem}
                    onClick={() => { onRestoreTargetChange(ch.id); setRestoreOpen(false); }}
                  >
                    <Checkbox
                      checked={restoreTargetId === ch.id}
                      onChange={() => { onRestoreTargetChange(ch.id); setRestoreOpen(false); }}
                      label={ch.title}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.archiveBlock}>
            <div className={styles.archiveHeader}>
              <span className={styles.archiveTitle}>Экспорт архива</span>
              <span className={styles.archiveDesc}>Скачать архив постов канала в формате JSON</span>
            </div>
            <Button
              variant="fill"
              intent="gradient"
              size="md"
              className={styles.archiveBtn}
              onClick={onExportClick}
            >
              Скачать
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveColumn;
