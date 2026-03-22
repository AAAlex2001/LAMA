'use client';

import { FC, useEffect, useRef } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import WheelPicker from '@/components/wheel-picker/wheel-picker';
import PlusIcon from '@/components/icons/plus-icon';
import TrashIcon from '@/components/icons/trash-icon';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Channel } from '@/types/channel';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  initFromChannel,
  setCommandsEnabled,
  toggleCommand,
  setFloodEnabled,
  setFloodMessageLimit,
  setFloodIntervalSeconds,
  setMuteDays as setFloodMuteDays,
  setMuteHours as setFloodMuteHours,
  setMuteMinutes as setFloodMuteMinutes,
  setAntispamEnabled,
  setBannedWordsEnabled,
  setMediaBlockEnabled,
  setNightModeEnabled,
} from '../../store/slices/moderation';
import {
  fetchFloodSettingsThunk,
  updateFloodSettingsThunk,
  disableFloodThunk,
  updateAutoDeleteThunk,
} from '../../store/thunks/moderation';
import {
  setEnabled as setBannedEnabled,
  setInputValue as setBannedInput,
  setMuteDays as setBannedMuteDays,
  setMuteHours as setBannedMuteHours,
  setMuteMinutes as setBannedMuteMinutes,
} from '../../store/slices/bannedWords';
import {
  fetchBannedWordsThunk,
  toggleBannedWordsThunk,
  addBannedWordThunk,
  deleteBannedWordThunk,
} from '../../store/thunks/bannedWords';
import styles from './ModerationSection.module.scss';

interface ModerationSectionProps {
  channel: Channel;
}

const QUICK_COMMANDS = [
  { id: 'admin', label: '/admin — связь с администратором' },
  { id: 'ban', label: '/ban — заблокировать участника' },
  { id: 'unban', label: '/unban — разблокировать участника' },
  { id: 'mute', label: '/mute — ограничить отправку сообщений' },
  { id: 'unmute', label: '/unmute — снять ограничение' },
  { id: 'kick', label: '/kick — удалить участника' },
];

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (mins > 0) parts.push(`${mins} мин`);
  return parts.join(' ') || '0 мин';
}

const ModerationSection: FC<ModerationSectionProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const floodSaveRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    commandsEnabled,
    selectedCommands,
    floodEnabled,
    floodSettings,
    muteDays: floodMuteDays,
    muteHours: floodMuteHours,
    muteMinutes: floodMuteMinutes,
    antispamEnabled,
    bannedWordsEnabled,
    mediaBlockEnabled,
    autoDeleteEnabled,
    nightModeEnabled,
  } = useAppSelector((s) => s.moderation);

  const {
    enabled: bannedEnabled,
    rules: bannedRules,
    inputValue: bannedInput,
    muteDays: bannedMuteDays,
    muteHours: bannedMuteHours,
    muteMinutes: bannedMuteMinutes,
    saving: bannedSaving,
  } = useAppSelector((s) => s.bannedWords);

  useEffect(() => {
    dispatch(initFromChannel({ nightModeEnabled: channel.night_mode_enabled }));
    dispatch(fetchFloodSettingsThunk(channel.id));
    dispatch(fetchBannedWordsThunk(channel.id));
  }, [channel.id, dispatch]);

  const scheduleFloodSave = () => {
    if (floodSaveRef.current) clearTimeout(floodSaveRef.current);
    floodSaveRef.current = setTimeout(() => {
      dispatch(updateFloodSettingsThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Настройки антифлуда сохранены'))
        .catch(() => showError('Ошибка сохранения'));
    }, 800);
  };

  const handleFloodToggle = async (enabled: boolean) => {
    dispatch(setFloodEnabled(enabled));
    if (!enabled) {
      try {
        await dispatch(disableFloodThunk(channel.id)).unwrap();
        showSuccess('Антифлуд отключён');
      } catch {
        showError('Ошибка сохранения');
      }
    }
  };

  const handleAutoDeleteToggle = async (enabled: boolean) => {
    try {
      await dispatch(updateAutoDeleteThunk({ channelId: channel.id, enabled })).unwrap();
      showSuccess(enabled ? 'Автоудаление включено' : 'Автоудаление отключено');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleBannedToggle = async (enabled: boolean) => {
    dispatch(setBannedWordsEnabled(enabled));
    try {
      await dispatch(toggleBannedWordsThunk({ channelId: channel.id, enabled })).unwrap();
      showSuccess(enabled ? 'Запрещённые слова включены' : 'Запрещённые слова отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleAddBannedWord = async () => {
    if (!bannedInput.trim()) return;
    try {
      await dispatch(addBannedWordThunk({ channelId: channel.id })).unwrap();
      showSuccess('Слово добавлено');
    } catch {
      showError('Ошибка добавления');
    }
  };

  const handleDeleteBannedWord = async (ruleId: number) => {
    try {
      await dispatch(deleteBannedWordThunk({ channelId: channel.id, ruleId })).unwrap();
      showSuccess('Слово удалено');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const floodTotalMinutes = floodMuteDays * 1440 + floodMuteHours * 60 + floodMuteMinutes;
  const bannedTotalMinutes = bannedMuteDays * 1440 + bannedMuteHours * 60 + bannedMuteMinutes;

  const leftColumn = bannedRules.filter((_, i) => i % 2 === 0);
  const rightColumn = bannedRules.filter((_, i) => i % 2 === 1);

  return (
    <div className={styles.section}>
      <div className={styles.settingsList}>
        {/* Быстрые команды */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Быстрые команды</span>
          <Toggle checked={commandsEnabled} onChange={(v) => dispatch(setCommandsEnabled(v))} />
        </div>
        {commandsEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.commandList}>
              {QUICK_COMMANDS.map((cmd) => (
                <div key={cmd.id} className={styles.commandItem} onClick={() => dispatch(toggleCommand(cmd.id))}>
                  <Checkbox
                    checked={selectedCommands.includes(cmd.id)}
                    onChange={() => dispatch(toggleCommand(cmd.id))}
                    label={cmd.label}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Антифлуд */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Антифлуд</span>
          <Toggle checked={floodEnabled} onChange={handleFloodToggle} />
        </div>
        {floodEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.floodDescription}>
              <span>Если участник отправляет </span>
              <input
                type="number"
                className={styles.floodInlineInput}
                value={floodSettings.flood_message_limit || 5}
                onChange={(e) => {
                  dispatch(setFloodMessageLimit(Math.max(1, parseInt(e.target.value) || 1)));
                  scheduleFloodSave();
                }}
                min={1}
                max={100}
              />
              <span> сообщений за </span>
              <input
                type="number"
                className={styles.floodInlineInput}
                value={floodSettings.flood_interval_seconds || 10}
                onChange={(e) => {
                  dispatch(setFloodIntervalSeconds(Math.max(1, parseInt(e.target.value) || 1)));
                  scheduleFloodSave();
                }}
                min={1}
                max={300}
              />
              <span> секунд</span>
            </div>

            <div className={styles.floodSettings}>
              <div className={styles.floodRow}>
                <span className={styles.floodRowLabel}>При превышении</span>
                <div className={styles.floodRowValue}>
                  <span className={styles.floodRowValueText}>
                    Ограничить на {formatDuration(floodTotalMinutes)}
                  </span>
                </div>
              </div>

              <div className={styles.timePicker}>
                <div className={styles.timeHeader}>
                  <span className={styles.timeLabel}>Срок ограничения:</span>
                  <span className={styles.timeValue}>{formatDuration(floodTotalMinutes)}</span>
                </div>

                <div className={styles.timeWheelWrapper}>
                  <div className={styles.timeLabelsRow}>
                    <span className={styles.timeLabelUnit}>дней</span>
                    <span className={styles.timeLabelUnit}>часов</span>
                    <span className={styles.timeLabelUnit}>минут</span>
                  </div>
                  <div className={styles.timeWheel}>
                    <WheelPicker value={floodMuteDays} onChange={(v) => { dispatch(setFloodMuteDays(v)); scheduleFloodSave(); }} min={0} max={30} />
                    <WheelPicker value={floodMuteHours} onChange={(v) => { dispatch(setFloodMuteHours(v)); scheduleFloodSave(); }} min={0} max={23} />
                    <WheelPicker value={floodMuteMinutes} onChange={(v) => { dispatch(setFloodMuteMinutes(v)); scheduleFloodSave(); }} min={0} max={59} />
                  </div>
                </div>

                <div className={styles.timePresetsRow}>
                  <div className={styles.timePresetsList}>
                    <button
                      type="button"
                      className={`${styles.timePreset} ${floodTotalMinutes === 1440 ? styles.active : ''}`}
                      onClick={() => {
                        dispatch(setFloodMuteDays(1)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0));
                        scheduleFloodSave();
                      }}
                    >
                      24 часа
                    </button>
                    <button
                      type="button"
                      className={`${styles.timePreset} ${floodTotalMinutes === 2880 ? styles.active : ''}`}
                      onClick={() => {
                        dispatch(setFloodMuteDays(2)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0));
                        scheduleFloodSave();
                      }}
                    >
                      48 часов
                    </button>
                    <button
                      type="button"
                      className={`${styles.timePreset} ${floodTotalMinutes === 0 ? styles.active : ''}`}
                      onClick={() => {
                        dispatch(setFloodMuteDays(0)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0));
                        scheduleFloodSave();
                      }}
                    >
                      Навсегда
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Антиспам */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Антиспам</span>
          <Toggle checked={antispamEnabled} onChange={(v) => dispatch(setAntispamEnabled(v))} />
        </div>

        {/* Запрещенные слова */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Запрещенные слова</span>
          <Toggle checked={bannedEnabled} onChange={handleBannedToggle} />
        </div>
        {bannedEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.floodRow}>
              <span className={styles.floodRowLabel}>При наличии</span>
              <div className={styles.floodRowValue}>
                <span className={styles.floodRowValueText}>
                  Ограничить на {formatDuration(bannedTotalMinutes)}
                </span>
              </div>
            </div>

            <div className={styles.timePicker}>
              <div className={styles.timeHeader}>
                <span className={styles.timeLabel}>Срок ограничения:</span>
                <span className={styles.timeValue}>{formatDuration(bannedTotalMinutes)}</span>
              </div>

              <div className={styles.timeWheelWrapper}>
                <div className={styles.timeLabelsRow}>
                  <span className={styles.timeLabelUnit}>дней</span>
                  <span className={styles.timeLabelUnit}>часов</span>
                  <span className={styles.timeLabelUnit}>минут</span>
                </div>
                <div className={styles.timeWheel}>
                  <WheelPicker value={bannedMuteDays} onChange={(v) => dispatch(setBannedMuteDays(v))} min={0} max={30} />
                  <WheelPicker value={bannedMuteHours} onChange={(v) => dispatch(setBannedMuteHours(v))} min={0} max={23} />
                  <WheelPicker value={bannedMuteMinutes} onChange={(v) => dispatch(setBannedMuteMinutes(v))} min={0} max={59} />
                </div>
              </div>

              <div className={styles.timePresetsRow}>
                <div className={styles.timePresetsList}>
                  <button
                    type="button"
                    className={`${styles.timePreset} ${bannedTotalMinutes === 1440 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(1)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}
                  >
                    24 часа
                  </button>
                  <button
                    type="button"
                    className={`${styles.timePreset} ${bannedTotalMinutes === 2880 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(2)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}
                  >
                    48 часов
                  </button>
                  <button
                    type="button"
                    className={`${styles.timePreset} ${bannedTotalMinutes === 0 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(0)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}
                  >
                    Навсегда
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.bannedWordsInputRow}>
              <input
                type="text"
                className={styles.bannedWordsInput}
                placeholder="Введите слово или фразу"
                value={bannedInput}
                onChange={(e) => dispatch(setBannedInput(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddBannedWord(); }}
              />
              <button
                type="button"
                className={styles.bannedWordsAddBtn}
                onClick={handleAddBannedWord}
                disabled={bannedSaving}
              >
                <PlusIcon width={16} height={16} color="#3B82F6" />
              </button>
            </div>

            {bannedRules.length > 0 && (
              <div className={styles.bannedWordsGrid}>
                <div className={styles.bannedWordsColumn}>
                  {leftColumn.map((rule) => (
                    <div key={rule.id} className={styles.bannedWordItem}>
                      <span className={styles.bannedWordDot} />
                      <span className={styles.bannedWordText}>{rule.phrase}</span>
                      <button
                        type="button"
                        className={styles.bannedWordDelete}
                        onClick={() => handleDeleteBannedWord(rule.id)}
                      >
                        <TrashIcon width={15} height={17} color="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.bannedWordsColumn}>
                  {rightColumn.map((rule) => (
                    <div key={rule.id} className={styles.bannedWordItem}>
                      <span className={styles.bannedWordDot} />
                      <span className={styles.bannedWordText}>{rule.phrase}</span>
                      <button
                        type="button"
                        className={styles.bannedWordDelete}
                        onClick={() => handleDeleteBannedWord(rule.id)}
                      >
                        <TrashIcon width={15} height={17} color="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Блокировка медиа */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Блокировка медиа</span>
          <Toggle checked={mediaBlockEnabled} onChange={(v) => dispatch(setMediaBlockEnabled(v))} />
        </div>

        {/* Автоудаление системных сообщений */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Автоудаление системных сообщений</span>
          <Toggle checked={autoDeleteEnabled} onChange={handleAutoDeleteToggle} />
        </div>

        {/* Ночной режим */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Ночной режим</span>
          <Toggle checked={nightModeEnabled} onChange={(v) => dispatch(setNightModeEnabled(v))} />
        </div>
      </div>
    </div>
  );
};

export default ModerationSection;
