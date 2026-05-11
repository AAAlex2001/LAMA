'use client';

import { FC, useState } from 'react';
import type { Channel } from '@/types/channel';
import QuickCommandsBlock from './QuickCommandsBlock';
import MediaBlockBlock from './MediaBlockBlock';
import AutoDeleteBlock from './AutoDeleteBlock';
import NightModeBlock from './NightModeBlock';
import FloodBlock from './FloodBlock';
import AntispamBlock from './AntispamBlock';
import BannedWordsBlock from './BannedWordsBlock';
import styles from '../ModerationSection.module.scss';

interface ModerationSectionProps {
  channel: Channel;
}

const ModerationSection: FC<ModerationSectionProps> = ({ channel }) => {
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const channelId = channel.id;

  return (
    <div className={styles.section}>
      <div className={styles.desktopGrid}>
        <div className={styles.column}>
          <QuickCommandsBlock channelId={channelId} />
          <MediaBlockBlock channelId={channelId} />
          <AutoDeleteBlock
            channelId={channelId}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
          />
          <NightModeBlock
            channel={channel}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
          />
        </div>

        <div className={styles.column}>
          <FloodBlock
            channelId={channelId}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
          />
          <AntispamBlock
            channelId={channelId}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
          />
          <BannedWordsBlock
            channelId={channelId}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
          />
        </div>
      </div>
    </div>
  );
};

export default ModerationSection;
