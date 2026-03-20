'use client';

import { FC } from 'react';
import { EditNameIcon } from '@/components/icons';
import type { Channel } from '@/types/channel';
import { formatMembers } from '../utils';
import styles from './ChannelInfoCard.module.scss';

interface ChannelInfoCardProps {
  channel: Channel;
  onEdit: () => void;
}

const ChannelInfoCard: FC<ChannelInfoCardProps> = ({ channel, onEdit }) => {
  const photoUrl = channel.photo_url || null;
  const initial = channel.title?.charAt(0)?.toUpperCase() || '?';

  return (
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
          <div className={styles.titleRow}>
            <span className={styles.title}>{channel.title}</span>
            <button className={styles.editBtn} type="button" onClick={onEdit}>
              <EditNameIcon width={20} height={20} color="#CED2D6" />
            </button>
          </div>
          {channel.username && (
            <span className={styles.username}>@{channel.username}</span>
          )}
          <span className={styles.members}>{formatMembers(channel.members_count || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default ChannelInfoCard;
