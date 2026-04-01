'use client';

import { FC, useState } from 'react';
import { EditNameIcon, ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import type { Bot } from '@/store/bots';
import type { ChannelBasic } from '@/types/channel';
import s from './BotGeneralSection.module.scss';

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

interface BotGeneralSectionProps {
  bot: Bot;
  channels: ChannelBasic[];
}

const BotGeneralSection: FC<BotGeneralSectionProps> = ({ bot, channels }) => {
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [checkSubscription, setCheckSubscription] = useState(false);
  const [respondToMessages, setRespondToMessages] = useState(false);

  const displayName = bot.first_name || bot.title || 'Бот';

  return (
    <div className={s.section}>
      <div className={s.block}>
        <span className={s.blockTitle}>Основная информация</span>
        <div className={s.fieldRow}>
          <span className={s.fieldLabel}>Название в LamaPlanner</span>
          <span className={s.fieldValue}>{displayName}</span>
        </div>
        <div className={s.fieldRow}>
          <span className={s.fieldLabel}>Описание бота</span>
          <span className={s.fieldValue}>{bot.description || 'Не указано'}</span>
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.block}>
        <button
          type="button"
          className={s.channelsToggle}
          onClick={() => setChannelsOpen(!channelsOpen)}
        >
          <span className={s.channelsLabel}>
            Привязан к: {channels.length} {channels.length === 1 ? 'каналу' : 'каналам'}
          </span>
          <ChevronDownIcon
            width={16}
            height={16}
            color="#383F45"
            className={`${s.channelsChevron} ${channelsOpen ? s.channelsChevronOpen : ''}`}
          />
        </button>

        {channelsOpen && (
          <div className={s.channelsList}>
            {channels.length === 0 && (
              <span className={s.channelName}>Нет привязанных каналов</span>
            )}
            {channels.map((ch) => (
              <div key={ch.id} className={s.channelItem}>
                <span className={s.channelName}>{ch.title || 'Без названия'}</span>
                <span className={s.channelMembers}>
                  {formatMembers(ch.members_count ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.divider} />

      <div className={s.block}>
        <span className={s.blockTitle}>Модерация и безопасность</span>

        <div className={s.fieldRow}>
          <span className={s.fieldLabel}>Одобрение заявок на вступление</span>
        </div>
        <div className={s.radioGroup}>
          <Checkbox
            variant="radio"
            checked={autoApprove}
            onChange={() => setAutoApprove(true)}
            label="Автоматически"
          />
          <Checkbox
            variant="radio"
            checked={!autoApprove}
            onChange={() => setAutoApprove(false)}
            label="Вручную"
          />
        </div>

        <div className={s.toggleRow}>
          <span className={s.toggleLabel}>Включить капчу</span>
          <Toggle checked={captchaEnabled} onChange={setCaptchaEnabled} />
        </div>

        <div className={s.toggleRow}>
          <span className={s.toggleLabel}>Проверять подписку на другие каналы LamaPlanner</span>
          <Toggle checked={checkSubscription} onChange={setCheckSubscription} />
        </div>

        <div className={s.toggleRow}>
          <span className={s.toggleLabel}>Если пользователь пишет боту</span>
          <Toggle checked={respondToMessages} onChange={setRespondToMessages} />
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.block}>
        <span className={s.blockTitle}>Статистика</span>
        <div className={s.statRow}>
          <span className={s.statLabel}>Пользователей всего</span>
          <span className={s.statValue}>0</span>
        </div>
        <div className={s.statRow}>
          <span className={s.statLabel}>Заблокировали</span>
          <span className={s.statValue}>0</span>
        </div>
        <div className={s.statRow}>
          <span className={s.statLabel}>Таблица сообщений</span>
          <span className={s.statValue}>0</span>
        </div>
        <div className={s.statRow}>
          <span className={s.statLabel}>Клики по кнопкам</span>
          <span className={s.statValue}>0</span>
        </div>
      </div>
    </div>
  );
};

export default BotGeneralSection;
