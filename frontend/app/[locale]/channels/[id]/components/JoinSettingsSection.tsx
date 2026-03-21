'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchJoinSettingsThunk,
  toggleAutoApproveThunk,
  toggleRequiredChannelThunk,
} from '../../store/thunks/join-settings';
import type { Channel } from '@/types/channel';
import styles from './JoinSettingsSection.module.scss';

interface JoinSettingsSectionProps {
  channel: Channel;
}

const JoinSettingsSection: FC<JoinSettingsSectionProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const channels = useAppSelector((s) => s.channels.channels) as Channel[];
  const { approvalMode, requiredChannels, loaded, saving, error } = useAppSelector((s) => s.joinSettings);

  const [open, setOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const botId = channel.bot_id;

  useEffect(() => {
    if (window.matchMedia('(min-width: 1440px)').matches) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (botId) {
      dispatch(fetchJoinSettingsThunk(botId));
    }
  }, [dispatch, botId]);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const isAutoApprove = approvalMode === 'AUTO';

  const handleToggleAutoApprove = (checked: boolean) => {
    if (!botId) return;
    dispatch(toggleAutoApproveThunk({ botId, checked }))
      .unwrap()
      .then(() => showSuccess(checked ? 'Автоодобрение включено' : 'Автоодобрение выключено'))
      .catch(() => {});
  };

  const handleToggleChannel = (telegramId: number) => {
    if (!botId) return;
    dispatch(toggleRequiredChannelThunk({
      botId,
      telegramId,
      currentChannels: requiredChannels,
      currentMode: approvalMode,
    }))
      .unwrap()
      .then(() => showSuccess('Настройки обновлены'))
      .catch(() => {});
  };

  const otherChannels = useMemo(
    () => channels.filter((ch) => ch.id !== channel.id),
    [channels, channel.id],
  );

  const filteredChannels = useMemo(() => {
    if (!search.trim()) return otherChannels;
    const q = search.toLowerCase();
    return otherChannels.filter((ch) =>
      ch.title.toLowerCase().includes(q) || ch.username?.toLowerCase().includes(q),
    );
  }, [otherChannels, search]);

  const selectedNames = useMemo(
    () => otherChannels
      .filter((ch) => requiredChannels.includes(ch.telegram_id!))
      .map((ch) => ch.title)
      .join(', '),
    [otherChannels, requiredChannels],
  );

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
          color="#383F45"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.content}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Одобрять заявки на вступление</span>
            <Toggle
              checked={isAutoApprove}
              onChange={handleToggleAutoApprove}
              disabled={saving || !loaded}
            />
          </div>

          <div className={styles.subSection}>
            <button
              className={styles.subRow}
              type="button"
              onClick={() => setChannelsOpen(!channelsOpen)}
            >
              <span className={styles.subLabel}>Проверять подписку на другие каналы</span>
              <ChevronDownIcon
                width={16}
                height={16}
                color="#383F45"
                className={`${styles.subChevron} ${channelsOpen ? styles.subChevronOpen : ''}`}
              />
            </button>
            {selectedNames && (
              <span className={styles.selectedChannels}>{selectedNames}</span>
            )}

            {channelsOpen && (
              <div className={styles.channelPicker}>
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Введите название канала"
                />
                <div className={styles.channelList}>
                  {filteredChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className={styles.channelItem}
                      onClick={() => handleToggleChannel(ch.telegram_id!)}
                    >
                      <Checkbox
                        checked={requiredChannels.includes(ch.telegram_id!)}
                        onChange={() => handleToggleChannel(ch.telegram_id!)}
                        label={ch.title}
                      />
                    </div>
                  ))}
                  {filteredChannels.length === 0 && (
                    <span className={styles.emptyText}>Нет каналов</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinSettingsSection;
