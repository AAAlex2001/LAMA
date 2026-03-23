'use client';

import { FC, useEffect, useRef, useState } from 'react';
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
  setBannedWordsEnabled,
  toggleMediaType,
  setMediaBlockEnabled,
  setAutoDeleteSystemMessages,
  setAutoDeleteCommandMessages,
} from '../../store/slices/moderation';
import {
  fetchFloodSettingsThunk,
  updateFloodSettingsThunk,
  disableFloodThunk,
  fetchAutoDeleteThunk,
  updateAutoDeleteThunk,
  updateMediaBlockThunk,
  updateQuickCommandsThunk,
} from '../../store/thunks/moderation';
import {
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
import {
  setMode as setAntispamMode,
  setAction as setAntispamAction,
  setMuteDays as setAntispamMuteDays,
  setMuteHours as setAntispamMuteHours,
  setMuteMinutes as setAntispamMuteMinutes,
  setUrlInput as setAntispamUrl,
  setWhitelist,
  setBlacklist,
} from '../../store/slices/antispam';
import {
  fetchAntispamThunk,
  updateAntispamThunk,
} from '../../store/thunks/antispam';
import {
  initFromChannel as initNightMode,
  setEnabled as setNightModeEnabledAction,
  setStart as setNightStart,
  setEnd as setNightEnd,
  setBlockMedia,
  setBlockText,
} from '../../store/slices/nightMode';
import { updateNightModeThunk } from '../../store/thunks/nightMode';
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

const MEDIA_TYPES = [
  { id: 'photo', label: 'Фотографии' },
  { id: 'video', label: 'Видеозаписи' },
  { id: 'gif', label: 'Гифки' },
  { id: 'files', label: 'Файлы' },
  { id: 'voice', label: 'Голосовые' },
];

const ANTISPAM_MODES = [
  { id: 'BLOCK_ALL', label: 'Запретить все ссылки' },
  { id: 'ALLOW_TME_ONLY', label: 'Все кроме t.me' },
  { id: 'WHITELIST', label: 'Белый список' },
  { id: 'BLACKLIST', label: 'Чёрный список' },
] as const;

const ANTISPAM_ACTIONS = [
  { id: 'DELETE', label: 'Удалить сообщение' },
  { id: 'MUTE', label: 'Ограничить' },
  { id: 'KICK', label: 'Удалить из чата' },
] as const;

const NIGHT_BLOCK_OPTIONS = [
  { id: 'text', label: 'Текстовые сообщения' },
  { id: 'media', label: 'Медиа' },
  { id: 'all', label: 'Все сообщения' },
] as const;


type AntispamMode = 'DISABLED' | 'BLOCK_ALL' | 'ALLOW_TME_ONLY' | 'WHITELIST' | 'BLACKLIST';

const ChevronIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const floodSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const antispamSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nightModeSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const commandsSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mediaBlockSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    commandsEnabled,
    selectedCommands,
    floodEnabled,
    floodSettings,
    muteDays: floodMuteDays,
    muteHours: floodMuteHours,
    muteMinutes: floodMuteMinutes,
    bannedWordsEnabled,
    mediaBlockEnabled,
    mediaBlockTypes,
    autoDeleteEnabled,
    autoDeleteSystemMessages,
    autoDeleteCommandMessages,
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

  const {
    mode: antispamMode,
    whitelist: antispamWhitelist,
    blacklist: antispamBlacklist,
    action: antispamAction,
    muteDays: antispamMuteDays,
    muteHours: antispamMuteHours,
    muteMinutes: antispamMuteMinutes,
    urlInput: antispamUrl,
    loaded: antispamLoaded,
  } = useAppSelector((s) => s.antispam);

  const {
    enabled: nightEnabled,
    start: nightStart,
    end: nightEnd,
    blockMedia: nightBlockMedia,
    blockText: nightBlockText,
  } = useAppSelector((s) => s.nightMode);

  useEffect(() => {
    dispatch(initFromChannel({
      nightModeEnabled: channel.night_mode_enabled,
      commandsEnabled: channel.commands_enabled ?? false,
      enabledCommands: channel.enabled_commands ?? null,
      blockMediaTypes: channel.block_media_types ?? null,
    }));
    dispatch(initNightMode({
      night_mode_enabled: channel.night_mode_enabled,
      night_mode_start: channel.night_mode_start,
      night_mode_end: channel.night_mode_end,
      night_mode_block_media: channel.night_mode_block_media,
      night_mode_block_text: channel.night_mode_block_text,
    }));
    dispatch(fetchFloodSettingsThunk(channel.id));
    dispatch(fetchBannedWordsThunk(channel.id));
    dispatch(fetchAntispamThunk(channel.id));
    dispatch(fetchAutoDeleteThunk(channel.id));
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

  const scheduleAntispamSave = () => {
    if (antispamSaveRef.current) clearTimeout(antispamSaveRef.current);
    antispamSaveRef.current = setTimeout(() => {
      dispatch(updateAntispamThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Настройки антиспама сохранены'))
        .catch(() => showError('Ошибка сохранения'));
    }, 800);
  };

  const scheduleNightModeSave = () => {
    if (nightModeSaveRef.current) clearTimeout(nightModeSaveRef.current);
    nightModeSaveRef.current = setTimeout(() => {
      dispatch(updateNightModeThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Ночной режим сохранён'))
        .catch(() => showError('Ошибка сохранения'));
    }, 800);
  };

  const scheduleCommandsSave = () => {
    if (commandsSaveRef.current) clearTimeout(commandsSaveRef.current);
    commandsSaveRef.current = setTimeout(() => {
      dispatch(updateQuickCommandsThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Команды обновлены'))
        .catch(() => showError('Ошибка сохранения'));
    }, 800);
  };

  const scheduleMediaBlockSave = () => {
    if (mediaBlockSaveRef.current) clearTimeout(mediaBlockSaveRef.current);
    mediaBlockSaveRef.current = setTimeout(() => {
      dispatch(updateMediaBlockThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Блокировка медиа обновлена'))
        .catch(() => showError('Ошибка сохранения'));
    }, 500);
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
    } else {
      scheduleFloodSave();
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

  const handleAntispamToggle = (enabled: boolean) => {
    const newMode: AntispamMode = enabled ? 'BLOCK_ALL' : 'DISABLED';
    dispatch(setAntispamMode(newMode as any));
    setTimeout(() => {
      dispatch(updateAntispamThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess(enabled ? 'Антиспам включён' : 'Антиспам отключён'))
        .catch(() => showError('Ошибка сохранения'));
    }, 0);
  };

  const handleAntispamModeChange = (mode: string) => {
    dispatch(setAntispamMode(mode as any));
    scheduleAntispamSave();
  };

  const handleAddToList = () => {
    const url = antispamUrl.trim();
    if (!url) return;
    if (antispamMode === 'WHITELIST') {
      dispatch(setWhitelist([...antispamWhitelist, url]));
    } else if (antispamMode === 'BLACKLIST') {
      dispatch(setBlacklist([...antispamBlacklist, url]));
    }
    dispatch(setAntispamUrl(''));
    scheduleAntispamSave();
  };

  const handleRemoveFromWhitelist = (url: string) => {
    dispatch(setWhitelist(antispamWhitelist.filter((u) => u !== url)));
    scheduleAntispamSave();
  };

  const handleRemoveFromBlacklist = (url: string) => {
    dispatch(setBlacklist(antispamBlacklist.filter((u) => u !== url)));
    scheduleAntispamSave();
  };

  const handleMediaTypeToggle = (typeId: string) => {
    dispatch(toggleMediaType(typeId));
    scheduleMediaBlockSave();
  };

  const handleMediaBlockToggle = async (enabled: boolean) => {
    dispatch(setMediaBlockEnabled(enabled));
    scheduleMediaBlockSave();
  };

  const handleAutoDeleteSystemToggle = (enabled: boolean) => {
    dispatch(setAutoDeleteSystemMessages(enabled));
    setTimeout(() => {
      dispatch(updateAutoDeleteThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Автоудаление обновлено'))
        .catch(() => showError('Ошибка сохранения'));
    }, 0);
  };

  const handleAutoDeleteCommandToggle = (enabled: boolean) => {
    dispatch(setAutoDeleteCommandMessages(enabled));
    setTimeout(() => {
      dispatch(updateAutoDeleteThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess('Автоудаление обновлено'))
        .catch(() => showError('Ошибка сохранения'));
    }, 0);
  };

  const handleNightModeToggle = (enabled: boolean) => {
    dispatch(setNightModeEnabledAction(enabled));
    setTimeout(() => {
      dispatch(updateNightModeThunk({ channelId: channel.id }))
        .unwrap()
        .then(() => showSuccess(enabled ? 'Ночной режим включён' : 'Ночной режим отключён'))
        .catch(() => showError('Ошибка сохранения'));
    }, 0);
  };

  const handleCommandsToggle = async (enabled: boolean) => {
    dispatch(setCommandsEnabled(enabled));
    try {
      await dispatch(updateQuickCommandsThunk({ channelId: channel.id })).unwrap();
      showSuccess(enabled ? 'Команды включены' : 'Команды отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleCommandToggle = (commandId: string) => {
    dispatch(toggleCommand(commandId));
    scheduleCommandsSave();
  };

  const antispamEnabled = antispamMode !== 'DISABLED';
  const activeList = antispamMode === 'WHITELIST' ? antispamWhitelist : antispamBlacklist;
  const showUrlList = antispamMode === 'WHITELIST' || antispamMode === 'BLACKLIST';
  const antispamTotalMinutes = antispamMuteDays * 1440 + antispamMuteHours * 60 + antispamMuteMinutes;
  const floodTotalMinutes = floodMuteDays * 1440 + floodMuteHours * 60 + floodMuteMinutes;
  const bannedTotalMinutes = bannedMuteDays * 1440 + bannedMuteHours * 60 + bannedMuteMinutes;

  const leftBannedColumn = bannedRules.filter((_, i) => i % 2 === 0);
  const rightBannedColumn = bannedRules.filter((_, i) => i % 2 === 1);
  const leftUrlColumn = activeList.filter((_, i) => i % 2 === 0);
  const rightUrlColumn = activeList.filter((_, i) => i % 2 === 1);
  const leftMediaCol = MEDIA_TYPES.filter((_, i) => i % 2 === 0);
  const rightMediaCol = MEDIA_TYPES.filter((_, i) => i % 2 === 1);

  const nightBlockType = nightBlockMedia && nightBlockText ? 'all' : nightBlockMedia ? 'media' : nightBlockText ? 'text' : 'none';

  const handleNightBlockTypeChange = (type: string) => {
    dispatch(setBlockMedia(type === 'media' || type === 'all'));
    dispatch(setBlockText(type === 'text' || type === 'all'));
    scheduleNightModeSave();
  };

  return (
    <div className={styles.section}>
      <div className={styles.settingsList}>
        {/* Быстрые команды */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Быстрые команды</span>
          <Toggle checked={commandsEnabled} onChange={handleCommandsToggle} />
        </div>
        {commandsEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.commandList}>
              {QUICK_COMMANDS.map((cmd) => (
                <div key={cmd.id} className={styles.commandItem} onClick={() => handleCommandToggle(cmd.id)}>
                  <Checkbox
                    checked={selectedCommands.includes(cmd.id)}
                    onChange={() => handleCommandToggle(cmd.id)}
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
                    <button type="button" className={`${styles.timePreset} ${floodTotalMinutes === 1440 ? styles.active : ''}`}
                      onClick={() => { dispatch(setFloodMuteDays(1)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0)); scheduleFloodSave(); }}>
                      24 часа
                    </button>
                    <button type="button" className={`${styles.timePreset} ${floodTotalMinutes === 2880 ? styles.active : ''}`}
                      onClick={() => { dispatch(setFloodMuteDays(2)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0)); scheduleFloodSave(); }}>
                      48 часов
                    </button>
                    <button type="button" className={`${styles.timePreset} ${floodTotalMinutes === 0 ? styles.active : ''}`}
                      onClick={() => { dispatch(setFloodMuteDays(0)); dispatch(setFloodMuteHours(0)); dispatch(setFloodMuteMinutes(0)); scheduleFloodSave(); }}>
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
          <Toggle checked={antispamEnabled} onChange={handleAntispamToggle} />
        </div>
        {antispamEnabled && antispamLoaded && (
          <div className={styles.expandedContent}>
            <div
              className={`${styles.pickerRow} ${styles.pickerRowBorder}`}
              onClick={() => setOpenPicker(openPicker === 'antispamMode' ? null : 'antispamMode')}
            >
              <span className={styles.pickerLabel}>Режим</span>
              <div className={styles.pickerRight}>
                <span className={styles.pickerValueText}>
                  {ANTISPAM_MODES.find((m) => m.id === antispamMode)?.label || 'Запретить все ссылки'}
                </span>
                <ChevronIcon className={`${styles.pickerChevron} ${openPicker === 'antispamMode' ? styles.open : ''}`} />
              </div>
            </div>
            {openPicker === 'antispamMode' && (
              <div className={styles.pickerOptions}>
                {ANTISPAM_MODES.map((m) => (
                  <div key={m.id} className={styles.checkboxRow} onClick={() => { handleAntispamModeChange(m.id); setOpenPicker(null); }}>
                    <Checkbox checked={antispamMode === m.id} onChange={() => { handleAntispamModeChange(m.id); setOpenPicker(null); }} label={m.label} />
                  </div>
                ))}
              </div>
            )}

            {showUrlList && (
              <>
                <div className={styles.bannedWordsInputRow}>
                  <input
                    type="text"
                    className={styles.bannedWordsInput}
                    placeholder={antispamMode === 'WHITELIST' ? 'Добавить домен в белый список' : 'Добавить домен в чёрный список'}
                    value={antispamUrl}
                    onChange={(e) => dispatch(setAntispamUrl(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddToList(); }}
                  />
                  <button type="button" className={styles.bannedWordsAddBtn} onClick={handleAddToList}>
                    <PlusIcon width={16} height={16} color="#3B82F6" />
                  </button>
                </div>

                {activeList.length > 0 && (
                  <div className={styles.bannedWordsGrid}>
                    <div className={styles.bannedWordsColumn}>
                      {leftUrlColumn.map((url) => (
                        <div key={url} className={styles.bannedWordItem}>
                          <span className={styles.bannedWordDot} />
                          <span className={styles.bannedWordText}>{url}</span>
                          <button
                            type="button"
                            className={styles.bannedWordDelete}
                            onClick={() => antispamMode === 'WHITELIST' ? handleRemoveFromWhitelist(url) : handleRemoveFromBlacklist(url)}
                          >
                            <TrashIcon width={15} height={17} color="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.bannedWordsColumn}>
                      {rightUrlColumn.map((url) => (
                        <div key={url} className={styles.bannedWordItem}>
                          <span className={styles.bannedWordDot} />
                          <span className={styles.bannedWordText}>{url}</span>
                          <button
                            type="button"
                            className={styles.bannedWordDelete}
                            onClick={() => antispamMode === 'WHITELIST' ? handleRemoveFromWhitelist(url) : handleRemoveFromBlacklist(url)}
                          >
                            <TrashIcon width={15} height={17} color="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div
              className={`${styles.pickerRow} ${styles.pickerRowBorder}`}
              onClick={() => setOpenPicker(openPicker === 'antispamAction' ? null : 'antispamAction')}
            >
              <span className={styles.pickerLabel}>При наличии</span>
              <div className={styles.pickerRight}>
                <span className={styles.pickerValueText}>
                  {antispamAction === 'MUTE'
                    ? `Ограничить на ${formatDuration(antispamTotalMinutes)}`
                    : ANTISPAM_ACTIONS.find((a) => a.id === antispamAction)?.label || 'Удалить сообщение'}
                </span>
                <ChevronIcon className={`${styles.pickerChevron} ${openPicker === 'antispamAction' ? styles.open : ''}`} />
              </div>
            </div>
            {openPicker === 'antispamAction' && (
              <div className={styles.pickerOptions}>
                {ANTISPAM_ACTIONS.map((a) => (
                  <div key={a.id} className={styles.checkboxRow} onClick={() => { dispatch(setAntispamAction(a.id)); scheduleAntispamSave(); setOpenPicker(null); }}>
                    <Checkbox checked={antispamAction === a.id} onChange={() => { dispatch(setAntispamAction(a.id)); scheduleAntispamSave(); setOpenPicker(null); }} label={a.label} />
                  </div>
                ))}
              </div>
            )}

            {antispamAction === 'MUTE' && (
              <div className={styles.timePicker}>
                <div className={styles.timeHeader}>
                  <span className={styles.timeLabel}>Срок ограничения:</span>
                  <span className={styles.timeValue}>{formatDuration(antispamTotalMinutes)}</span>
                </div>
                <div className={styles.timeWheelWrapper}>
                  <div className={styles.timeLabelsRow}>
                    <span className={styles.timeLabelUnit}>дней</span>
                    <span className={styles.timeLabelUnit}>часов</span>
                    <span className={styles.timeLabelUnit}>минут</span>
                  </div>
                  <div className={styles.timeWheel}>
                    <WheelPicker value={antispamMuteDays} onChange={(v) => { dispatch(setAntispamMuteDays(v)); scheduleAntispamSave(); }} min={0} max={30} />
                    <WheelPicker value={antispamMuteHours} onChange={(v) => { dispatch(setAntispamMuteHours(v)); scheduleAntispamSave(); }} min={0} max={23} />
                    <WheelPicker value={antispamMuteMinutes} onChange={(v) => { dispatch(setAntispamMuteMinutes(v)); scheduleAntispamSave(); }} min={0} max={59} />
                  </div>
                </div>
                <div className={styles.timePresetsRow}>
                  <div className={styles.timePresetsList}>
                    <button type="button" className={`${styles.timePreset} ${antispamTotalMinutes === 1440 ? styles.active : ''}`}
                      onClick={() => { dispatch(setAntispamMuteDays(1)); dispatch(setAntispamMuteHours(0)); dispatch(setAntispamMuteMinutes(0)); scheduleAntispamSave(); }}>
                      24 часа
                    </button>
                    <button type="button" className={`${styles.timePreset} ${antispamTotalMinutes === 2880 ? styles.active : ''}`}
                      onClick={() => { dispatch(setAntispamMuteDays(2)); dispatch(setAntispamMuteHours(0)); dispatch(setAntispamMuteMinutes(0)); scheduleAntispamSave(); }}>
                      48 часов
                    </button>
                    <button type="button" className={`${styles.timePreset} ${antispamTotalMinutes === 0 ? styles.active : ''}`}
                      onClick={() => { dispatch(setAntispamMuteDays(0)); dispatch(setAntispamMuteHours(0)); dispatch(setAntispamMuteMinutes(0)); scheduleAntispamSave(); }}>
                      Навсегда
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                  <button type="button" className={`${styles.timePreset} ${bannedTotalMinutes === 1440 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(1)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}>
                    24 часа
                  </button>
                  <button type="button" className={`${styles.timePreset} ${bannedTotalMinutes === 2880 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(2)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}>
                    48 часов
                  </button>
                  <button type="button" className={`${styles.timePreset} ${bannedTotalMinutes === 0 ? styles.active : ''}`}
                    onClick={() => { dispatch(setBannedMuteDays(0)); dispatch(setBannedMuteHours(0)); dispatch(setBannedMuteMinutes(0)); }}>
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
              <button type="button" className={styles.bannedWordsAddBtn} onClick={handleAddBannedWord} disabled={bannedSaving}>
                <PlusIcon width={16} height={16} color="#3B82F6" />
              </button>
            </div>

            {bannedRules.length > 0 && (
              <div className={styles.bannedWordsGrid}>
                <div className={styles.bannedWordsColumn}>
                  {leftBannedColumn.map((rule) => (
                    <div key={rule.id} className={styles.bannedWordItem}>
                      <span className={styles.bannedWordDot} />
                      <span className={styles.bannedWordText}>{rule.phrase}</span>
                      <button type="button" className={styles.bannedWordDelete} onClick={() => handleDeleteBannedWord(rule.id)}>
                        <TrashIcon width={15} height={17} color="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.bannedWordsColumn}>
                  {rightBannedColumn.map((rule) => (
                    <div key={rule.id} className={styles.bannedWordItem}>
                      <span className={styles.bannedWordDot} />
                      <span className={styles.bannedWordText}>{rule.phrase}</span>
                      <button type="button" className={styles.bannedWordDelete} onClick={() => handleDeleteBannedWord(rule.id)}>
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
          <Toggle checked={mediaBlockEnabled} onChange={handleMediaBlockToggle} />
        </div>
        {mediaBlockEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.mediaGrid}>
              <div className={styles.mediaColumn}>
                {leftMediaCol.map((type) => (
                  <div key={type.id} className={styles.mediaItem} onClick={() => handleMediaTypeToggle(type.id)}>
                    <Checkbox
                      checked={mediaBlockTypes.includes(type.id)}
                      onChange={() => handleMediaTypeToggle(type.id)}
                      label={type.label}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.mediaColumn}>
                {rightMediaCol.map((type) => (
                  <div key={type.id} className={styles.mediaItem} onClick={() => handleMediaTypeToggle(type.id)}>
                    <Checkbox
                      checked={mediaBlockTypes.includes(type.id)}
                      onChange={() => handleMediaTypeToggle(type.id)}
                      label={type.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Автоудаление системных сообщений */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Автоудаление системных сообщений</span>
          <Toggle checked={autoDeleteEnabled} onChange={(v) => {
            dispatch(setAutoDeleteSystemMessages(v));
            dispatch(setAutoDeleteCommandMessages(v));
            setTimeout(() => {
              dispatch(updateAutoDeleteThunk({ channelId: channel.id }))
                .unwrap()
                .then(() => showSuccess(v ? 'Автоудаление включено' : 'Автоудаление отключено'))
                .catch(() => showError('Ошибка сохранения'));
            }, 0);
          }} />
        </div>
        {autoDeleteEnabled && (
          <div className={styles.expandedContent}>
            <div
              className={`${styles.pickerRow} ${styles.pickerRowBorder}`}
              onClick={() => setOpenPicker(openPicker === 'autoDeleteWhat' ? null : 'autoDeleteWhat')}
            >
              <span className={styles.pickerLabel}>Что удалять:</span>
              <div className={styles.pickerRight}>
                <span className={styles.pickerValueText}>
                  {autoDeleteSystemMessages && autoDeleteCommandMessages
                    ? 'Всё'
                    : autoDeleteSystemMessages
                      ? 'Сообщения о вступлении'
                      : autoDeleteCommandMessages
                        ? 'Команды'
                        : 'Не выбрано'}
                </span>
                <ChevronIcon className={`${styles.pickerChevron} ${openPicker === 'autoDeleteWhat' ? styles.open : ''}`} />
              </div>
            </div>
            {openPicker === 'autoDeleteWhat' && (
              <div className={styles.pickerOptions}>
                <div className={styles.checkboxRow} onClick={() => handleAutoDeleteSystemToggle(!autoDeleteSystemMessages)}>
                  <Checkbox
                    checked={autoDeleteSystemMessages}
                    onChange={() => handleAutoDeleteSystemToggle(!autoDeleteSystemMessages)}
                    label="Сообщения о вступлении"
                  />
                </div>
                <div className={styles.checkboxRow} onClick={() => handleAutoDeleteCommandToggle(!autoDeleteCommandMessages)}>
                  <Checkbox
                    checked={autoDeleteCommandMessages}
                    onChange={() => handleAutoDeleteCommandToggle(!autoDeleteCommandMessages)}
                    label="Команды"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ночной режим */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Ночной режим</span>
          <Toggle checked={nightEnabled} onChange={handleNightModeToggle} />
        </div>
        {nightEnabled && (
          <div className={styles.expandedContent}>
            <div className={styles.floodDescription}>
              <span>Ограничивать сообщения с </span>
              <input
                type="text"
                className={styles.floodInlineInput}
                style={{ width: 46 }}
                value={nightStart || '23:00'}
                placeholder="23:00"
                maxLength={5}
                onChange={(e) => { dispatch(setNightStart(e.target.value)); scheduleNightModeSave(); }}
              />
              <span> до </span>
              <input
                type="text"
                className={styles.floodInlineInput}
                style={{ width: 46 }}
                value={nightEnd || '07:00'}
                placeholder="07:00"
                maxLength={5}
                onChange={(e) => { dispatch(setNightEnd(e.target.value)); scheduleNightModeSave(); }}
              />
            </div>

            <div
              className={styles.pickerRow}
              onClick={() => setOpenPicker(openPicker === 'nightBlock' ? null : 'nightBlock')}
            >
              <span className={styles.pickerLabel}>Что ограничивать:</span>
              <div className={styles.pickerRight}>
                <span className={styles.pickerValueText}>
                  {NIGHT_BLOCK_OPTIONS.find((o) => o.id === nightBlockType)?.label || 'Все сообщения'}
                </span>
                <ChevronIcon className={`${styles.pickerChevron} ${openPicker === 'nightBlock' ? styles.open : ''}`} />
              </div>
            </div>
            {openPicker === 'nightBlock' && (
              <div className={styles.pickerOptions}>
                {NIGHT_BLOCK_OPTIONS.map((o) => (
                  <div key={o.id} className={styles.checkboxRow} onClick={() => { handleNightBlockTypeChange(o.id); setOpenPicker(null); }}>
                    <Checkbox checked={nightBlockType === o.id} onChange={() => { handleNightBlockTypeChange(o.id); setOpenPicker(null); }} label={o.label} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationSection;
