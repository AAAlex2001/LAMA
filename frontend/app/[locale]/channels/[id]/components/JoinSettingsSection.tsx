'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
import WheelPicker from '@/components/wheel-picker/wheel-picker';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchJoinSettingsThunk,
  toggleAutoApproveThunk,
  toggleRequiredChannelThunk,
  fetchCaptchaSettingsThunk,
  toggleCaptchaThunk,
  updateCaptchaSettingsThunk,
} from '../../store/thunks/join-settings';
import {
  setCaptchaTimeoutSeconds,
  setCaptchaFailAction,
  setCaptchaFailDurationSeconds,
  setCaptchaRestrictionType,
  setCaptchaModalOpen,
  type CaptchaFailAction as CaptchaFailActionType,
} from '../../store/slices/joinSettings';
import CaptchaSettingsModal from './CaptchaSettingsModal';
import type { Channel } from '@/types/channel';
import styles from './JoinSettingsSection.module.scss';

const TIMEOUT_OPTIONS = [
  { value: 10, label: '10 секунд' },
  { value: 30, label: '30 секунд' },
  { value: 60, label: '1 минута' },
  { value: 120, label: '2 минуты' },
  { value: 300, label: '5 минут' },
];

const FAIL_ACTION_OPTIONS: { value: CaptchaFailActionType; label: string }[] = [
  { value: 'KICK', label: 'Кикнуть' },
  { value: 'MUTE', label: 'Ограничить на время' },
  { value: 'BAN', label: 'Забанить' },
];

const RESTRICTION_OPTIONS = [
  { value: 'send_messages', label: 'Ограничить отправку сообщений' },
  { value: 'send_media', label: 'Ограничить медиа' },
  { value: 'full', label: 'Полное ограничение' },
];

const ChevronPickerIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (mins > 0) parts.push(`${mins} мин`);
  return parts.join(' ') || '0 мин';
}

interface JoinSettingsSectionProps {
  channel: Channel;
}

const JoinSettingsSection: FC<JoinSettingsSectionProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const channels = useAppSelector((s) => s.channels.channels) as Channel[];
  const {
    approvalMode, requiredChannels, loaded, saving, error,
    captchaEnabled, captchaTimeoutSeconds, captchaFailAction,
    captchaFailDurationSeconds, captchaRestrictionType,
    captchaLoaded, captchaModalOpen,
  } = useAppSelector((s) => s.joinSettings);

  const [open, setOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const botId = channel.bot_id;
  const channelId = channel.id;
  const isSupergroup = channel.channel_type === 'SUPERGROUP';

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
    if (channelId && isSupergroup) {
      dispatch(fetchCaptchaSettingsThunk(channelId));
    }
  }, [dispatch, channelId, isSupergroup]);

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

  const handleToggleCaptcha = (checked: boolean) => {
    dispatch(toggleCaptchaThunk({ channelId, enabled: checked }))
      .unwrap()
      .then(() => showSuccess(checked ? 'Капча включена' : 'Капча выключена'))
      .catch(() => {});
  };

  const handleCaptchaPickerChange = (field: string, value: number | string) => {
    let data: Record<string, unknown> = {};
    switch (field) {
      case 'timeout':
        dispatch(setCaptchaTimeoutSeconds(value as number));
        data = { captcha_timeout_seconds: value };
        break;
      case 'failAction':
        dispatch(setCaptchaFailAction(value as CaptchaFailActionType));
        data = { captcha_fail_action: value };
        break;
      case 'failDuration':
        dispatch(setCaptchaFailDurationSeconds(value as number));
        data = { captcha_fail_duration_seconds: value };
        break;
      case 'restriction':
        dispatch(setCaptchaRestrictionType(value as string));
        data = { captcha_restriction_type: value };
        break;
    }
    dispatch(updateCaptchaSettingsThunk({ channelId, data }))
      .unwrap()
      .then(() => showSuccess('Настройки капчи обновлены'))
      .catch(() => showError('Ошибка сохранения'));
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

  const showFailDuration = captchaFailAction === 'MUTE';

  const timeoutSummary = TIMEOUT_OPTIONS.find((o) => o.value === captchaTimeoutSeconds)?.label || '30 секунд';
  const failActionSummary = (() => {
    const label = FAIL_ACTION_OPTIONS.find((o) => o.value === captchaFailAction)?.label || 'Кикнуть';
    if (captchaFailAction === 'MUTE' && captchaFailDurationSeconds) {
      return `${label} ${formatDuration(captchaFailDurationSeconds)}`;
    }
    return label;
  })();
  const restrictionSummary = RESTRICTION_OPTIONS.find((o) => o.value === captchaRestrictionType)?.label || 'Ограничить отправку сообщений';

  const failDurationSeconds = Math.min(captchaFailDurationSeconds ?? 3600, 86400);
  const failDurHours = Math.floor(failDurationSeconds / 3600);
  const failDurMinutes = Math.floor((failDurationSeconds % 3600) / 60);

  const handleFailDurChange = (hours: number, mins: number) => {
    const total = Math.min(hours * 3600 + mins * 60, 86400) || 60;
    dispatch(setCaptchaFailDurationSeconds(total));
    dispatch(updateCaptchaSettingsThunk({ channelId, data: { captcha_fail_duration_seconds: total } }))
      .unwrap()
      .then(() => showSuccess('Настройки капчи обновлены'))
      .catch(() => showError('Ошибка сохранения'));
  };

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
          <div className={styles.column}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Одобрять заявки на вступление</span>
              <Toggle
                checked={isAutoApprove}
                onChange={handleToggleAutoApprove}
                disabled={saving || !loaded}
              />
            </div>

            {isSupergroup && !captchaEnabled && (
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
            )}
          </div>

          {isSupergroup && requiredChannels.length === 0 && (
            <div className={styles.column}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Капча для новых участников</span>
                <Toggle
                  checked={captchaEnabled}
                  onChange={handleToggleCaptcha}
                  disabled={saving || !captchaLoaded}
                />
              </div>
              <span className={styles.captchaDescription}>
                Математический пример (N + M), который нужно решить для входа в группу
              </span>

              {captchaEnabled && (
                <div className={styles.captchaSettings}>
                  <div
                    className={styles.pickerRow}
                    onClick={() => setOpenPicker(openPicker === 'timeout' ? null : 'timeout')}
                  >
                    <span className={styles.pickerLabel}>Время на ответ</span>
                    <div className={styles.pickerRight}>
                      <span className={styles.pickerValueText}>{timeoutSummary}</span>
                      <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'timeout' ? styles.pickerChevronOpen : ''}`} />
                    </div>
                  </div>
                  {openPicker === 'timeout' && (
                    <div className={styles.pickerOptions}>
                      {TIMEOUT_OPTIONS.map((opt) => (
                        <div key={opt.value} className={styles.checkboxRow} onClick={() => { handleCaptchaPickerChange('timeout', opt.value); setOpenPicker(null); }}>
                          <Checkbox
                            variant="radio"
                            checked={opt.value === captchaTimeoutSeconds}
                            onChange={() => { handleCaptchaPickerChange('timeout', opt.value); setOpenPicker(null); }}
                            label={opt.label}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={styles.pickerRow}
                    onClick={() => setOpenPicker(openPicker === 'failAction' ? null : 'failAction')}
                  >
                    <span className={styles.pickerLabel}>Действие при провале</span>
                    <div className={styles.pickerRight}>
                      <span className={styles.pickerValueText}>{failActionSummary}</span>
                      <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'failAction' ? styles.pickerChevronOpen : ''}`} />
                    </div>
                  </div>
                  {openPicker === 'failAction' && (
                    <div className={styles.pickerOptions}>
                      {FAIL_ACTION_OPTIONS.map((opt) => (
                        <div key={opt.value} className={styles.checkboxRow} onClick={() => { handleCaptchaPickerChange('failAction', opt.value); setOpenPicker(null); }}>
                          <Checkbox
                            variant="radio"
                            checked={opt.value === captchaFailAction}
                            onChange={() => { handleCaptchaPickerChange('failAction', opt.value); setOpenPicker(null); }}
                            label={opt.label}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {showFailDuration && (
                    <div className={styles.timePicker}>
                      <div className={styles.timeHeader}>
                        <span className={styles.timeLabel}>Длительность:</span>
                        <span className={styles.timeValue}>{formatDuration(failDurationSeconds)}</span>
                      </div>
                      <div className={styles.timeWheelWrapper}>
                        <div className={styles.timeLabelsRow}>
                          <span className={styles.timeLabelUnit}>часов</span>
                          <span className={styles.timeLabelUnit}>минут</span>
                        </div>
                        <div className={styles.timeWheel}>
                          <WheelPicker value={failDurHours} onChange={(v) => handleFailDurChange(v, failDurMinutes)} min={0} max={24} />
                          <WheelPicker value={failDurMinutes} onChange={(v) => handleFailDurChange(failDurHours, v)} min={0} max={59} />
                        </div>
                      </div>
                      <div className={styles.timePresetsRow}>
                        <div className={styles.timePresetsList}>
                          <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 3600 ? styles.active : ''}`}
                            onClick={() => handleFailDurChange(1, 0)}>
                            1 час
                          </button>
                          <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 43200 ? styles.active : ''}`}
                            onClick={() => handleFailDurChange(12, 0)}>
                            12 часов
                          </button>
                          <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 86400 ? styles.active : ''}`}
                            onClick={() => handleFailDurChange(24, 0)}>
                            24 часа
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={styles.pickerRow}
                    onClick={() => setOpenPicker(openPicker === 'restriction' ? null : 'restriction')}
                  >
                    <span className={styles.pickerLabel}>Ограничение</span>
                    <div className={styles.pickerRight}>
                      <span className={styles.pickerValueText}>{restrictionSummary}</span>
                      <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'restriction' ? styles.pickerChevronOpen : ''}`} />
                    </div>
                  </div>
                  {openPicker === 'restriction' && (
                    <div className={styles.pickerOptions}>
                      {RESTRICTION_OPTIONS.map((opt) => (
                        <div key={opt.value} className={styles.checkboxRow} onClick={() => { handleCaptchaPickerChange('restriction', opt.value); setOpenPicker(null); }}>
                          <Checkbox
                            variant="radio"
                            checked={opt.value === captchaRestrictionType}
                            onChange={() => { handleCaptchaPickerChange('restriction', opt.value); setOpenPicker(null); }}
                            label={opt.label}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="fill"
                    intent="gradient"
                    size="md"
                    className={styles.configButton}
                    onClick={() => dispatch(setCaptchaModalOpen(true))}
                  >
                    Настройка капчи
                  </Button>
                </div>
              )}

              <CaptchaSettingsModal
                isOpen={captchaModalOpen}
                onOpenChange={(v) => dispatch(setCaptchaModalOpen(v))}
                channelId={channelId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JoinSettingsSection;
