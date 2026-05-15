'use client';

import { FC, useEffect, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { useChannelsQuery, useCaptchaSettingsQuery } from '@/store/channels';
import type { Channel } from '@/types/channel';
import ApprovalBlock from './ApprovalBlock';
import CaptchaBlock from './CaptchaBlock';
import WelcomeBlock from './WelcomeBlock';
import styles from '../JoinSettingsSection.module.scss';

interface JoinSettingsSectionProps {
  channel: Channel;
}

const JoinSettingsSection: FC<JoinSettingsSectionProps> = ({ channel }) => {
  const botId = channel.bot_id;
  const channelId = channel.id;
  const isGroup = channel.channel_type === 'GROUP' || channel.channel_type === 'SUPERGROUP';
  const isForum = !!channel.is_forum;

  const channelsQuery = useChannelsQuery();
  const channels = (channelsQuery.data?.items ?? []) as Channel[];

  const captchaQuery = useCaptchaSettingsQuery(isGroup ? channelId : null);
  const captchaEnabled = captchaQuery.data?.captcha_enabled ?? false;

  const [open, setOpen] = useState(false);
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia('(min-width: 1440px)').matches) {
      setOpen(true);
    }
  }, []);

  if (!botId) return null;

  return (
    <div className={styles.section}>
      <button
        className={`${styles.row} ${styles.rowActive}`}
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span className={styles.label}>Настройки вступления</span>
        <ChevronDownIcon
          width={16}
          height={16}
          color="#000000"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.content}>
          <div className={styles.leftGroup}>
            <ApprovalBlock
              channel={channel}
              channels={channels}
              isGroup={isGroup}
              captchaEnabled={captchaEnabled}
            />
            {isGroup && (
              <CaptchaBlock
                channelId={channelId}
                botId={botId}
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            )}
          </div>

          {isGroup && (
            <WelcomeBlock
              botId={botId}
              channelId={channelId}
              channelTitle={channel.title || ''}
              isForum={isForum}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default JoinSettingsSection;
