'use client';

import { FC } from 'react';
import { EditNameIcon, BanIcon } from '@/components/icons';
import type { Bot } from '@/store/bots';
import styles from './BotInfoCard.module.scss';

interface BotInfoCardProps {
  bot: Bot;
  onEdit: () => void;
  onToggleActive: () => void;
}

const BotInfoCard: FC<BotInfoCardProps> = ({ bot, onEdit, onToggleActive }) => {
  const photoUrl = bot.photo_url || null;
  const displayName = bot.first_name || bot.title || 'Бот';
  const initial = displayName.charAt(0).toUpperCase();
  const isActive = bot.status === 'ACTIVE';

  return (
    <div className={styles.info}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback}>{initial}</span>
          )}
        </div>
        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{displayName}</span>
            <button className={styles.editBtn} type="button" onClick={onEdit}>
              <EditNameIcon width={20} height={20} color="#CED2D6" />
            </button>
          </div>
          {bot.username && (
            <span className={styles.username}>@{bot.username.replace(/^@/, '')}</span>
          )}
        </div>
        <button
          type="button"
          className={`${styles.banBtn} ${!isActive ? styles.banBtnActive : ''}`}
          onClick={onToggleActive}
        >
          <BanIcon width={20} height={20} color={!isActive ? '#E33326' : '#B0B4B8'} />
        </button>
      </div>
    </div>
  );
};

export default BotInfoCard;
