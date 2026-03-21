'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import SearchIcon from '@/components/icons/search-icon';
import Toggle from '@/components/toggle/toggle';
import Input from '@/components/input/input';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppSelector } from '../../store';
import { apiRequest } from '@/store/api';
import type { Channel } from '@/types/channel';
import styles from './JoinSettingsSection.module.scss';

interface JoinSettingsSectionProps {
  channel: Channel;
}

interface AutoApprovalData {
  auto_approval_mode: 'AUTO' | 'MANUAL' | 'CRITERIA';
  approval_criteria: { required_channels?: number[] } | null;
}

const JoinSettingsSection: FC<JoinSettingsSectionProps> = ({ channel }) => {
  const { showSuccess, showError } = useNotifications();
  const channels = useAppSelector((s) => s.channels.channels) as Channel[];

  const [open, setOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [approvalMode, setApprovalMode] = useState<'AUTO' | 'MANUAL' | 'CRITERIA'>('MANUAL');
  const [requiredChannels, setRequiredChannels] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const botId = channel.bot_id;

  useEffect(() => {
    if (!botId) return;
    apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`)
      .then((data) => {
        setApprovalMode(data.auto_approval_mode);
        setRequiredChannels(data.approval_criteria?.required_channels || []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [botId]);

  const isAutoApprove = approvalMode === 'AUTO';

  const handleToggleAutoApprove = async (checked: boolean) => {
    if (!botId) return;
    const newMode = checked ? 'AUTO' : 'MANUAL';
    setSaving(true);
    try {
      const data = await apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`, {
        method: 'PUT',
        body: JSON.stringify({
          auto_approval_mode: newMode,
          approval_criteria: null,
        }),
      });
      setApprovalMode(data.auto_approval_mode);
      showSuccess(checked ? 'Автоодобрение включено' : 'Автоодобрение выключено');
    } catch {
      showError('Ошибка обновления настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChannel = async (telegramId: number) => {
    if (!botId) return;
    const isSelected = requiredChannels.includes(telegramId);
    const newChannels = isSelected
      ? requiredChannels.filter((id) => id !== telegramId)
      : [...requiredChannels, telegramId];

    const newMode = newChannels.length > 0 ? 'CRITERIA' : approvalMode === 'CRITERIA' ? 'MANUAL' : approvalMode;

    setSaving(true);
    try {
      const data = await apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`, {
        method: 'PUT',
        body: JSON.stringify({
          auto_approval_mode: newMode,
          approval_criteria: newChannels.length > 0 ? { required_channels: newChannels } : null,
        }),
      });
      setApprovalMode(data.auto_approval_mode);
      setRequiredChannels(data.approval_criteria?.required_channels || []);
      showSuccess('Настройки обновлены');
    } catch {
      showError('Ошибка обновления настроек');
    } finally {
      setSaving(false);
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
                className={`${styles.chevron} ${channelsOpen ? styles.chevronOpen : ''}`}
              />
            </button>
            {selectedNames && (
              <span className={styles.selectedChannels}>{selectedNames}</span>
            )}

            {channelsOpen && (
              <div className={styles.channelPicker}>
                <Input
                  value={search}
                  onChange={setSearch}
                  placeholder="Поиск канала..."
                  variant="white"
                  icon={<SearchIcon width={16} height={16} />}
                />
                <div className={styles.channelList}>
                  {filteredChannels.map((ch) => (
                    <div key={ch.id} className={styles.channelItem}>
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
