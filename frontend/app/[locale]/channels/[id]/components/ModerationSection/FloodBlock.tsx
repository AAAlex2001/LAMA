'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useFloodSettingsQuery,
  useUpdateFloodSettingsMutation,
} from '@/store/channels';
import { FLOOD_ACTIONS } from './constants';
import { formatDuration, minutesToParts, partsToMinutes } from './helpers';
import PickerRow from './PickerRow';
import TimeMutePicker from './TimeMutePicker';
import styles from '../ModerationSection.module.scss';

interface FloodBlockProps {
  channelId: number;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

const FloodBlock: FC<FloodBlockProps> = ({ channelId, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useFloodSettingsQuery(channelId);
  const update = useUpdateFloodSettingsMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [enabled, setEnabled] = useState(false);
  const [messageLimit, setMessageLimit] = useState(5);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [action, setAction] = useState<'MUTE' | 'KICK' | 'DELETE'>('MUTE');
  const [muteMinutes, setMuteMinutes] = useState(60);

  useEffect(() => {
    if (query.data) {
      const next = !!query.data.flood_message_limit;
      setEnabled(next);
      setMessageLimit(query.data.flood_message_limit ?? 5);
      setIntervalSeconds(query.data.flood_interval_seconds ?? 10);
      setAction((query.data.flood_action as 'MUTE' | 'KICK' | 'DELETE') ?? 'MUTE');
      setMuteMinutes(query.data.flood_mute_duration_minutes ?? 60);
    }
  }, [query.data]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const sendNow = (data: Record<string, unknown>, successMsg: string) => {
    update.mutate(
      { channelId, data },
      {
        onSuccess: () => showSuccess(successMsg),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const sendDebounced = (data: Record<string, unknown>, successMsg: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => sendNow(data, successMsg), 800);
  };

  const buildPayload = (overrides: Partial<{
    messageLimit: number;
    intervalSeconds: number;
    action: 'MUTE' | 'KICK' | 'DELETE';
    muteMinutes: number;
  }> = {}) => {
    const a = overrides.action ?? action;
    return {
      flood_message_limit: overrides.messageLimit ?? messageLimit,
      flood_interval_seconds: overrides.intervalSeconds ?? intervalSeconds,
      flood_action: a,
      flood_mute_duration_minutes: a === 'MUTE' ? (overrides.muteMinutes ?? muteMinutes) || 1 : null,
    };
  };

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    if (next) {
      sendNow(buildPayload(), 'Антифлуд включён');
    } else {
      sendNow({
        flood_message_limit: null,
        flood_interval_seconds: null,
        flood_mute_duration_minutes: null,
      }, 'Антифлуд отключён');
    }
  };

  const handleLimitChange = (value: number) => {
    const v = Math.max(1, value || 1);
    setMessageLimit(v);
    sendDebounced(buildPayload({ messageLimit: v }), 'Настройки антифлуда сохранены');
  };

  const handleIntervalChange = (value: number) => {
    const v = Math.max(1, value || 1);
    setIntervalSeconds(v);
    sendDebounced(buildPayload({ intervalSeconds: v }), 'Настройки антифлуда сохранены');
  };

  const handleActionChange = (next: 'MUTE' | 'KICK' | 'DELETE') => {
    setAction(next);
    setOpenPicker(null);
    sendDebounced(buildPayload({ action: next }), 'Настройки антифлуда сохранены');
  };

  const handleMuteChange = (days: number, hours: number, mins: number) => {
    const total = partsToMinutes(days, hours, mins);
    setMuteMinutes(total);
    sendDebounced(buildPayload({ muteMinutes: total }), 'Настройки антифлуда сохранены');
  };

  const muteParts = minutesToParts(muteMinutes);
  const actionLabel = FLOOD_ACTIONS.find((a) => a.id === action)?.label || 'Ограничить';
  const actionSummary = action === 'MUTE'
    ? `${actionLabel} на ${formatDuration(muteMinutes)}`
    : actionLabel;

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Антифлуд</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <div className={styles.floodDescription}>
            <span>Если участник отправляет </span>
            <input
              type="number"
              className={styles.floodInlineInput}
              value={messageLimit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
              min={1}
              max={100}
            />
            <span> сообщений за </span>
            <input
              type="number"
              className={styles.floodInlineInput}
              value={intervalSeconds}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
              min={1}
              max={300}
            />
            <span> секунд</span>
          </div>

          <PickerRow
            label="При превышении"
            value={actionSummary}
            open={openPicker === 'floodAction'}
            onToggle={() => setOpenPicker(openPicker === 'floodAction' ? null : 'floodAction')}
          />
          {openPicker === 'floodAction' && (
            <div className={styles.pickerOptions}>
              {FLOOD_ACTIONS.map((a) => (
                <div key={a.id} className={styles.checkboxRow} onClick={() => handleActionChange(a.id)}>
                  <Checkbox
                    variant="radio"
                    checked={action === a.id}
                    onChange={() => handleActionChange(a.id)}
                    label={a.label}
                  />
                </div>
              ))}
            </div>
          )}

          {action === 'MUTE' && (
            <TimeMutePicker
              days={muteParts.days}
              hours={muteParts.hours}
              minutes={muteParts.mins}
              onChange={handleMuteChange}
            />
          )}
        </div>
      )}
    </>
  );
};

export default FloodBlock;
