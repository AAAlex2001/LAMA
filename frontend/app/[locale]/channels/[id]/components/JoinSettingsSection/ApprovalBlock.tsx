'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useAutoApprovalQuery,
  useUpdateAutoApprovalMutation,
} from '@/store/channels';
import type { Channel } from '@/types/channel';
import styles from '../JoinSettingsSection.module.scss';

interface ApprovalBlockProps {
  channel: Channel;
  channels: Channel[];
  isGroup: boolean;
  captchaEnabled: boolean;
}

const ApprovalBlock: FC<ApprovalBlockProps> = ({ channel, channels, isGroup, captchaEnabled }) => {
  const { showSuccess, showError } = useNotifications();
  const botId = channel.bot_id;

  const approvalQuery = useAutoApprovalQuery(botId);
  const updateApproval = useUpdateAutoApprovalMutation();
  const approvalMode = approvalQuery.data?.auto_approval_mode ?? 'MANUAL';
  const requiredChannels = approvalQuery.data?.approval_criteria?.required_channels ?? [];
  const loaded = approvalQuery.isSuccess;
  const saving = updateApproval.isPending;

  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (approvalQuery.error) showError(approvalQuery.error.message);
  }, [approvalQuery.error, showError]);

  const isAutoApprove = approvalMode === 'AUTO';

  const handleToggleAutoApprove = async (checked: boolean) => {
    if (!botId) return;
    try {
      await updateApproval.mutateAsync({
        botId,
        data: {
          auto_approval_mode: checked ? 'AUTO' : 'MANUAL',
          approval_criteria: null,
        },
      });
      showSuccess(checked ? 'Автоодобрение включено' : 'Автоодобрение выключено');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleToggleChannel = async (telegramId: number) => {
    if (!botId) return;
    const isSelected = requiredChannels.includes(telegramId);
    const newChannels = isSelected
      ? requiredChannels.filter((id) => id !== telegramId)
      : [...requiredChannels, telegramId];
    const newMode = newChannels.length > 0
      ? 'CRITERIA'
      : approvalMode === 'CRITERIA' ? 'MANUAL' : approvalMode;
    try {
      await updateApproval.mutateAsync({
        botId,
        data: {
          auto_approval_mode: newMode,
          approval_criteria: newChannels.length > 0 ? { required_channels: newChannels } : null,
        },
      });
      showSuccess('Настройки обновлены');
    } catch {
      showError('Ошибка сохранения');
    }
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

  const selectedNames = otherChannels
    .filter((ch) => requiredChannels.includes(ch.telegram_id!))
    .map((ch) => ch.title)
    .join(', ');

  return (
    <div className={styles.column}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Одобрять заявки на вступление</span>
        <Toggle
          checked={isAutoApprove}
          onChange={handleToggleAutoApprove}
          disabled={saving || !loaded}
        />
      </div>

      {isGroup && !captchaEnabled && (
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
              color="#000000"
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
      )}
    </div>
  );
};

export default ApprovalBlock;
