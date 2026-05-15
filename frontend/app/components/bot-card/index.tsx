'use client';

import { FC } from 'react';
import type { Bot } from '@/store/bots';
import { BanIcon, ChartIcon, SettingsIcon, TrashIcon } from '@/components/icons';
import s from './styles.module.scss';

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

export interface BotCardChannel {
  id: number;
  title: string;
  membersCount: number;
}

interface BotCardProps {
  bot: Bot;
  channels: BotCardChannel[];
  onSettings?: (bot: Bot) => void;
  onStats?: (bot: Bot) => void;
  onToggleActive: (bot: Bot) => void;
  onDelete: (bot: Bot) => void;
  toggling?: boolean;
  hideStats?: boolean;
}

const BotCard: FC<BotCardProps> = ({
  bot,
  channels,
  onSettings,
  onStats,
  onToggleActive,
  onDelete,
  toggling,
  hideStats,
}) => {
  const isActive = bot.status === 'ACTIVE';
  const displayName = bot.first_name || bot.title || 'Бот';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const kindLabel = bot.welcome_enabled ? 'Приветственный бот' : 'Бот';
  const username = bot.username ? `@${bot.username.replace(/^@/, '')}` : '';

  return (
    <div className={s.card}>
      <div className={s.info}>
        <div className={s.header}>
          <div className={s.avatar}>
            {bot.photo_url ? (
              <img src={bot.photo_url} alt={displayName} className={s.avatarImg} />
            ) : (
              <span className={s.avatarFallback}>{avatarLetter}</span>
            )}
          </div>
          <div className={s.meta}>
            <span className={s.title}>{kindLabel}</span>
            <span className={s.subtitle}>{displayName}</span>
          </div>
          <span className={`${s.statusDot} ${isActive ? s.statusActive : s.statusInactive}`} />
        </div>

        <div className={s.row}>
          <span className={s.rowLabel}>{displayName}</span>
          {username && <span className={s.rowValue}>{username}</span>}
        </div>

        {channels.length === 0 && (
          <div className={s.row}>
            <span className={s.rowValue}>Нет привязанных каналов</span>
          </div>
        )}
        {channels.map((ch) => (
          <div key={ch.id} className={s.row}>
            <span className={s.rowValue}>{ch.title}</span>
            <span className={s.rowValue}>{formatMembers(ch.membersCount)}</span>
          </div>
        ))}
      </div>

      <div className={s.actions}>
        {onSettings && (
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionBtnBlue}`}
            onClick={() => onSettings(bot)}
          >
            <SettingsIcon width={24} height={24} color="#B0B4B8" />
          </button>
        )}
        {!hideStats && onStats && (
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionBtnBlue}`}
            onClick={() => onStats(bot)}
          >
            <ChartIcon width={20} height={20} color="#B0B4B8" />
          </button>
        )}
        <button
          type="button"
          className={`${s.actionBtn} ${s.actionBtnDanger} ${!isActive ? s.actionBtnDangerActive : ''}`}
          onClick={() => onToggleActive(bot)}
          disabled={toggling}
        >
          <BanIcon width={20} height={20} color={!isActive ? '#E33326' : '#B0B4B8'} />
        </button>
        <button
          type="button"
          className={`${s.actionBtn} ${s.actionBtnDanger} ${s.actionBtnSmall}`}
          onClick={() => onDelete(bot)}
        >
          <TrashIcon width={18} height={20} color="#B0B4B8" />
        </button>
      </div>
    </div>
  );
};

export default BotCard;
