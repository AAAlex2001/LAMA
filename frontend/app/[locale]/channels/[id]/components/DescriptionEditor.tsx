'use client';

import { FC } from 'react';
import type { Channel } from '@/types/channel';
import styles from './DescriptionEditor.module.scss';

interface DescriptionEditorProps {
  channel: Channel;
}

const DescriptionEditor: FC<DescriptionEditorProps> = ({ channel }) => {
  return (
    <div className={styles.block}>
      <span className={styles.label}>Описание</span>
      <div className={styles.content}>
        <span className={styles.text}>{channel.description || 'Нет описания'}</span>
      </div>
    </div>
  );
};

export default DescriptionEditor;
