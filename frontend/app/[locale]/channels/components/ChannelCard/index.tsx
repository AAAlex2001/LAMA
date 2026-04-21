'use client';

import { FC } from 'react';
import type { Channel } from '@/types/channel';
import SettingsIcon from '@/components/icons/settings-icon';
import TrashIcon from '@/components/icons/trash-icon';
import MathOperationsIcon from '@/components/icons/math-operations-icon';
import BackupOutlineIcon from '@/components/icons/backup-outline-icon';
import WelcomeIcon from '@/components/icons/welcome-icon';
import QuickCommandsIcon from '@/components/icons/quick-commands-icon';
import AutoRepliesIcon from '@/components/icons/auto-replies-icon';
import AntifloodIcon from '@/components/icons/antiflood-icon';
import AntispamIcon from '@/components/icons/antispam-icon';
import styles from './styles.module.scss';

interface ChannelCardProps {
  channel: Channel;
  onSettings: (channel: Channel) => void;
  onDelete: (channel: Channel) => void;
}

function formatMembers(count: number): string {
  const formatted = count.toLocaleString('ru-RU');
  const lastTwo = count % 100;
  const lastOne = count % 10;
  let word: string;
  if (lastTwo >= 11 && lastTwo <= 19) word = 'пользователей';
  else if (lastOne === 1) word = 'пользователь';
  else if (lastOne >= 2 && lastOne <= 4) word = 'пользователя';
  else word = 'пользователей';
  return `${formatted} ${word}`;
}

const ChannelCard: FC<ChannelCardProps> = ({ channel, onSettings, onDelete }) => {
  const photoUrl = channel.photo_url || null;
  const initial = channel.title?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <img src={photoUrl} alt={channel.title} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarFallback}>{initial}</span>
            )}
          </div>
          <div className={styles.meta}>
            <span className={styles.title}>{channel.title}</span>
            <span className={styles.members}>{formatMembers(channel.members_count || 0)}</span>
          </div>
        </div>

        {channel.username && (
          <div className={styles.username}>@{channel.username}</div>
        )}

        {channel.description && (
          <div className={styles.description}>{channel.description}</div>
        )}
      </div>

      {(() => {
        const antiflood =
          !!(channel.flood_message_limit && channel.flood_interval_seconds);
        const antispam = channel.link_filter_mode && channel.link_filter_mode !== 'DISABLED';
        const hasAny =
          channel.captcha_enabled ||
          channel.backup_mode !== 'DISABLED' ||
          channel.welcome_enabled ||
          channel.commands_enabled ||
          channel.auto_reply_enabled ||
          antiflood ||
          antispam;

        if (!hasAny) return null;

        return (
          <div className={styles.features}>
            {channel.captcha_enabled && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Капча</span>
                <MathOperationsIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {channel.backup_mode !== 'DISABLED' && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Резервное копирование</span>
                <BackupOutlineIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {channel.welcome_enabled && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Приветствие</span>
                <WelcomeIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {channel.commands_enabled && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Быстрые команды</span>
                <QuickCommandsIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {channel.auto_reply_enabled && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Автоответы</span>
                <AutoRepliesIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {antiflood && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Антифлуд</span>
                <AntifloodIcon width={20} height={20} color="#B0B4B8" />
              </div>
            )}
            {antispam && (
              <div className={styles.featureItem}>
                <span className={styles.featureText}>Антиспам</span>
                <AntispamIcon width={19} height={18} color="#B0B4B8" />
              </div>
            )}
          </div>
        );
      })()}

      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.actionBtnBlue}`} onClick={() => onSettings(channel)}>
          <SettingsIcon width={24} height={24} color="#B0B4B8" />
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} onClick={() => onDelete(channel)}>
          <TrashIcon width={18} height={20} color="#B0B4B8" />
        </button>
      </div>
    </div>
  );
};

export default ChannelCard;
