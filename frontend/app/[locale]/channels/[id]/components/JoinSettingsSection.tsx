'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
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
  { value: 'BAN', label: 'Забанить на время' },
];

const RESTRICTION_OPTIONS = [
  { value: 'send_messages', label: 'Ограничить отправку сообщений' },
  { value: 'send_media', label: 'Ограничить медиа' },
  { value: 'full', label: 'Полное ограничение' },
];

const FAIL_DURATION_OPTIONS = [
  { value: 60, label: '1 минута' },
  { value: 300, label: '5 минут' },
  { value: 600, label: '10 минут' },
  { value: 1800, label: '30 минут' },
  { value: 3600, label: '1 час' },
  { value: 86400, label: '24 часа' },
];

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
    if (channelId) {
      dispatch(fetchCaptchaSettingsThunk(channelId));
    }
  }, [dispatch, channelId]);

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
    switch (field) {
      case 'timeout':
        dispatch(setCaptchaTimeoutSeconds(value as number));
        dispatch(updateCaptchaSettingsThunk({
          channelId,
          data: { captcha_timeout_seconds: value as number },
        }));
        break;
      case 'failAction':
        dispatch(setCaptchaFailAction(value as CaptchaFailActionType));
        dispatch(updateCaptchaSettingsThunk({
          channelId,
          data: { captcha_fail_action: value as CaptchaFailActionType },
        }));
        break;
      case 'failDuration':
        dispatch(setCaptchaFailDurationSeconds(value as number));
        dispatch(updateCaptchaSettingsThunk({
          channelId,
          data: { captcha_fail_duration_seconds: value as number },
        }));
        break;
      case 'restriction':
        dispatch(setCaptchaRestrictionType(value as string));
        dispatch(updateCaptchaSettingsThunk({
          channelId,
          data: { captcha_restriction_type: value as string },
        }));
        break;
    }
    setOpenPicker(null);
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

  const timeoutLabel = TIMEOUT_OPTIONS.find((o) => o.value === captchaTimeoutSeconds)?.label || `${captchaTimeoutSeconds}с`;
  const failActionLabel = FAIL_ACTION_OPTIONS.find((o) => o.value === captchaFailAction)?.label || captchaFailAction;
  const restrictionLabel = RESTRICTION_OPTIONS.find((o) => o.value === captchaRestrictionType)?.label || captchaRestrictionType;
  const failDurationLabel = FAIL_DURATION_OPTIONS.find((o) => o.value === captchaFailDurationSeconds)?.label || '';
  const showFailDuration = captchaFailAction === 'MUTE' || captchaFailAction === 'BAN';

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

          <div className={styles.divider} />

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
                  <span className={styles.pickerValueText}>{timeoutLabel}</span>
                  <ChevronDownIcon
                    width={14}
                    height={14}
                    color="#858585"
                    className={`${styles.pickerChevron} ${openPicker === 'timeout' ? styles.pickerChevronOpen : ''}`}
                  />
                </div>
              </div>
              {openPicker === 'timeout' && (
                <div className={styles.pickerOptions}>
                  {TIMEOUT_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.radioRow} ${opt.value === captchaTimeoutSeconds ? styles.radioRowActive : ''}`}
                      onClick={() => handleCaptchaPickerChange('timeout', opt.value)}
                    >
                      <span>{opt.label}</span>
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
                  <span className={styles.pickerValueText}>{failActionLabel}</span>
                  <ChevronDownIcon
                    width={14}
                    height={14}
                    color="#858585"
                    className={`${styles.pickerChevron} ${openPicker === 'failAction' ? styles.pickerChevronOpen : ''}`}
                  />
                </div>
              </div>
              {openPicker === 'failAction' && (
                <div className={styles.pickerOptions}>
                  {FAIL_ACTION_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.radioRow} ${opt.value === captchaFailAction ? styles.radioRowActive : ''}`}
                      onClick={() => handleCaptchaPickerChange('failAction', opt.value)}
                    >
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {showFailDuration && (
                <>
                  <div
                    className={styles.pickerRow}
                    onClick={() => setOpenPicker(openPicker === 'failDuration' ? null : 'failDuration')}
                  >
                    <span className={styles.pickerLabel}>Длительность</span>
                    <div className={styles.pickerRight}>
                      <span className={styles.pickerValueText}>{failDurationLabel}</span>
                      <ChevronDownIcon
                        width={14}
                        height={14}
                        color="#858585"
                        className={`${styles.pickerChevron} ${openPicker === 'failDuration' ? styles.pickerChevronOpen : ''}`}
                      />
                    </div>
                  </div>
                  {openPicker === 'failDuration' && (
                    <div className={styles.pickerOptions}>
                      {FAIL_DURATION_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          className={`${styles.radioRow} ${opt.value === captchaFailDurationSeconds ? styles.radioRowActive : ''}`}
                          onClick={() => handleCaptchaPickerChange('failDuration', opt.value)}
                        >
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div
                className={styles.pickerRow}
                onClick={() => setOpenPicker(openPicker === 'restriction' ? null : 'restriction')}
              >
                <span className={styles.pickerLabel}>Ограничение</span>
                <div className={styles.pickerRight}>
                  <span className={styles.pickerValueText}>{restrictionLabel}</span>
                  <ChevronDownIcon
                    width={14}
                    height={14}
                    color="#858585"
                    className={`${styles.pickerChevron} ${openPicker === 'restriction' ? styles.pickerChevronOpen : ''}`}
                  />
                </div>
              </div>
              {openPicker === 'restriction' && (
                <div className={styles.pickerOptions}>
                  {RESTRICTION_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.radioRow} ${opt.value === captchaRestrictionType ? styles.radioRowActive : ''}`}
                      onClick={() => handleCaptchaPickerChange('restriction', opt.value)}
                    >
                      <span>{opt.label}</span>
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
  );
};

export default JoinSettingsSection;
