'use client';

import { FC, useState } from 'react';
import ChannelsSection from './ChannelsSection';
import AutoDeleteSection from './AutoDeleteSection';
import RepeatSection from './RepeatSection';
import BottomActions from './BottomActions';
import styles from './PostSettings.module.scss';

interface PostSettingsConnectedProps {
  className?: string;
  onPreview?: () => void;
  previewDisabled?: boolean;
}

const PostSettingsConnected: FC<PostSettingsConnectedProps> = ({
  className, onPreview, previewDisabled,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>('channels');

  const toggle = (key: string) => (willOpen: boolean) =>
    setOpenDropdown(willOpen ? key : null);

  return (
    <div className={`${styles.postSettings} ${className || ''}`}>
      <div className={styles.settingsContent}>
        <div className={styles.title}>Настройки публикации</div>

        <div className={styles.settingsList}>
          <ChannelsSection isOpen={openDropdown === 'channels'} onToggle={toggle('channels')} />
          <AutoDeleteSection isOpen={openDropdown === 'auto-delete'} onToggle={toggle('auto-delete')} />
          <RepeatSection isOpen={openDropdown === 'repeat'} onToggle={toggle('repeat')} />
        </div>
      </div>

      <BottomActions onPreview={onPreview} previewDisabled={previewDisabled} />
    </div>
  );
};

export default PostSettingsConnected;
