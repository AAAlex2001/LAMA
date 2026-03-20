'use client';

import { FC } from 'react';
import SettingsIcon from '@/components/icons/settings-icon';
import ChartIcon from '@/components/icons/chart-icon';
import BanIcon from '@/components/icons/ban-icon';
import TrashIcon from '@/components/icons/trash-icon';
import type { BotData } from '../../store/slices/bots';
import type { Channel } from '@/types/channel';
import { formatMembers } from '../utils';
import styles from './BotCard.module.scss';

interface BotCardProps {
  bot: BotData;
  isBotActive: boolean;
  toggling: boolean;
  botChannels: Channel[];
  onToggleActive: () => void;
  onRemove: () => void;
}

const BotCard: FC<BotCardProps> = ({ bot, isBotActive, toggling, botChannels, onToggleActive, onRemove }) => {
  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{bot.first_name || 'Бот'}</span>
          <span className={isBotActive ? styles.statusGreen : styles.statusGray} />
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{bot.first_name}</span>
          <span className={styles.detailValue}>@{bot.username}</span>
        </div>
      </div>

      {botChannels.map((ch) => (
        <div key={ch.id} className={styles.channelRow}>
          <span className={styles.detailValue}>{ch.title}</span>
          <span className={styles.detailValue}>{formatMembers(ch.members_count || 0)}</span>
        </div>
      ))}

      <div className={styles.actions}>
        <button className={styles.actionBtn} type="button">
          <SettingsIcon width={24} height={24} color="#B0B4B8" />
        </button>
        <button className={styles.actionBtn} type="button">
          <ChartIcon width={20} height={20} color="#B0B4B8" />
        </button>
        <button
          className={`${styles.actionBtn} ${!isBotActive ? styles.actionBtnDanger : ''}`}
          type="button"
          onClick={onToggleActive}
          disabled={toggling}
        >
          <BanIcon width={20} height={20} color={isBotActive ? '#B0B4B8' : '#E33326'} />
        </button>
        <button className={styles.actionBtnSmall} type="button" onClick={onRemove}>
          <TrashIcon width={15} height={17} color="#B0B4B8" />
        </button>
      </div>
    </div>
  );
};

export default BotCard;
