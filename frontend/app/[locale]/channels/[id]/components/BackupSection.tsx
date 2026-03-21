'use client';

import { FC, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import type { Channel } from '@/types/channel';
import styles from './BackupSection.module.scss';

interface BackupSectionProps {
  channel: Channel;
}

const BackupSection: FC<BackupSectionProps> = ({ channel }) => {
  const [copyToBackup, setCopyToBackup] = useState(false);
  const [saveArchive, setSaveArchive] = useState(false);

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Резервное копирование</span>
      </div>

      <div className={styles.toggleList}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Копировать новые посты в резервный канал</span>
          <Toggle checked={copyToBackup} onChange={setCopyToBackup} />
        </div>

        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Сохранять архив в системе LamaPlanner</span>
          <Toggle checked={saveArchive} onChange={setSaveArchive} />
        </div>
      </div>
    </div>
  );
};

export default BackupSection;
