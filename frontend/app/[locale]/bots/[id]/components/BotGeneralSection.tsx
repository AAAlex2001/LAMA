'use client';

import { FC, useState, useCallback } from 'react';
import Dropdown from '@/components/dropdown/dropdown';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Bot, ApprovalMode } from '@/store/bots';
import { bindBotToChannelThunk, unbindBotFromChannelThunk, updateBotThunk } from '@/store/bots';
import ConnectChannelModal from '@/components/connect-channel-modal';
import { fetchChannelsThunk } from '@/store/channels';
import type { ChannelBasic } from '@/types/channel';
import { useAppDispatch } from '../../store';
import s from './BotGeneralSection.module.scss';

interface BotGeneralSectionProps {
  bot: Bot;
  channels: ChannelBasic[];
  allChannels: ChannelBasic[];
}

const BotGeneralSection: FC<BotGeneralSectionProps> = ({ bot, channels, allChannels }) => {
  const dispatch = useAppDispatch();
  const { showError } = useNotifications();

  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(bot.auto_approval_mode || 'AUTO');
  const [destInbox, setDestInbox] = useState(
    !bot.approval_destination || bot.approval_destination === 'INBOX',
  );
  const [destTelegram, setDestTelegram] = useState(
    bot.approval_destination === 'TELEGRAM_BOT',
  );
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [checkSubscription, setCheckSubscription] = useState(false);
  const [respondToMessages, setRespondToMessages] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayName = bot.first_name || bot.title || 'Бот';

  const boundIds = new Set(channels.map((ch) => ch.id));
  const channelOptions = allChannels.map((ch) => ({
    id: String(ch.id),
    label: ch.title || 'Без названия',
    checked: boundIds.has(ch.id),
  }));

  const handleChannelToggle = useCallback(
    async (id: string, checked: boolean) => {
      const channelId = Number(id);
      try {
        if (checked) {
          await dispatch(bindBotToChannelThunk({ channelId, botId: bot.id })).unwrap();
        } else {
          await dispatch(unbindBotFromChannelThunk(channelId)).unwrap();
        }
      } catch (err) {
        showError(typeof err === 'string' ? err : 'Ошибка привязки канала');
      }
    },
    [dispatch, bot.id, showError],
  );

  const handleDropdownToggle = useCallback(
    (open: boolean) => {
      setDropdownOpen(open);
      if (open) dispatch(fetchChannelsThunk({ force: true }));
    },
    [dispatch],
  );

  const handleApprovalModeChange = useCallback(
    (mode: ApprovalMode) => {
      setApprovalMode(mode);
      dispatch(updateBotThunk({ botId: bot.id, data: { auto_approval_mode: mode } as any }));
    },
    [dispatch, bot.id],
  );

  const handleDestInboxChange = useCallback(
    (checked: boolean) => {
      setDestInbox(checked);
      const dest = checked ? 'INBOX' : 'TELEGRAM_BOT';
      dispatch(updateBotThunk({ botId: bot.id, data: { approval_destination: dest } }));
    },
    [dispatch, bot.id],
  );

  const handleDestTelegramChange = useCallback(
    (checked: boolean) => {
      setDestTelegram(checked);
      const dest = checked ? 'TELEGRAM_BOT' : 'INBOX';
      dispatch(updateBotThunk({ botId: bot.id, data: { approval_destination: dest } }));
    },
    [dispatch, bot.id],
  );

  const handleConnectSuccess = useCallback(() => {
    dispatch(fetchChannelsThunk({ force: true }));
  }, [dispatch]);

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

      <Dropdown
        label={`Привязан к: ${channels.length} ${channels.length === 1 ? 'каналу' : 'каналам'}`}
        variant="channels"
        options={channelOptions}
        showSearch
        showCheckboxes
        placeholder="Поиск канала"
        selectedCount={channels.length}
        totalCount={allChannels.length}
        addNewLabel="Подключить новый"
        onOptionChange={handleChannelToggle}
        onAddNew={() => setConnectOpen(true)}
        isOpen={dropdownOpen}
        onToggle={handleDropdownToggle}
      />

      <div className={s.block}>
        <span className={s.blockTitle}>Модерация и безопасность</span>

        <div className={s.fieldRow}>
          <span className={s.fieldLabel}>Одобрение заявок на вступление</span>
        </div>
        <div className={s.radioGroup}>
          <Checkbox
            variant="radio"
            checked={approvalMode === 'AUTO'}
            onChange={() => handleApprovalModeChange('AUTO')}
            label="Автоматически"
          />
          <Checkbox
            variant="radio"
            checked={approvalMode === 'MANUAL'}
            onChange={() => handleApprovalModeChange('MANUAL')}
            label="Вручную"
          />
        </div>

        {approvalMode === 'MANUAL' && (
          <div className={s.approvalDestBlock}>
            <span className={s.approvalDestTitle}>Где одобрять заявки</span>
            <div className={s.radioGroup}>
              <Checkbox
                checked={destInbox}
                onChange={handleDestInboxChange}
                label="Инбокс LamaPlanner"
              />
              <Checkbox
                checked={destTelegram}
                onChange={handleDestTelegramChange}
                label="В Telegram-боте"
              />
            </div>
          </div>
        )}

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

      <ConnectChannelModal
        isOpen={connectOpen}
        onOpenChange={setConnectOpen}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
};

export default BotGeneralSection;
