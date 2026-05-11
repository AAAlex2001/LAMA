'use client';

import { FC, useEffect, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useAutoDeleteSettingsQuery,
  useUpdateAutoDeleteSettingsMutation,
  type AutoDeleteUpdateRequest,
} from '@/store/channels';
import { AUTO_DELETE_TYPES, AUTO_DELETE_DELAYS } from './constants';
import PickerRow from './PickerRow';
import styles from '../ModerationSection.module.scss';

interface AutoDeleteBlockProps {
  channelId: number;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

interface AutoDeleteFlags {
  delete_system_messages: boolean;
  delete_command_messages: boolean;
  delete_join_messages: boolean;
  delete_all_messages: boolean;
  delete_text_only: boolean;
  delete_media_only: boolean;
}

const FIELD_BY_TYPE: Record<string, keyof AutoDeleteFlags> = {
  system: 'delete_system_messages',
  commands: 'delete_command_messages',
  join: 'delete_join_messages',
  all: 'delete_all_messages',
  textOnly: 'delete_text_only',
  mediaOnly: 'delete_media_only',
};

const ALL_OFF: AutoDeleteFlags = {
  delete_system_messages: false,
  delete_command_messages: false,
  delete_join_messages: false,
  delete_all_messages: false,
  delete_text_only: false,
  delete_media_only: false,
};

const AutoDeleteBlock: FC<AutoDeleteBlockProps> = ({ channelId, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useAutoDeleteSettingsQuery(channelId);
  const update = useUpdateAutoDeleteSettingsMutation();

  const [flags, setFlags] = useState<AutoDeleteFlags>(ALL_OFF);
  const [delaySeconds, setDelaySeconds] = useState(0);

  useEffect(() => {
    if (query.data) {
      setFlags({
        delete_system_messages: query.data.delete_system_messages,
        delete_command_messages: query.data.delete_command_messages,
        delete_join_messages: query.data.delete_join_messages,
        delete_all_messages: query.data.delete_all_messages,
        delete_text_only: query.data.delete_text_only,
        delete_media_only: query.data.delete_media_only,
      });
      setDelaySeconds(query.data.delete_delay_seconds);
    }
  }, [query.data]);

  const send = (next: AutoDeleteFlags, nextDelay: number, successMsg: string) => {
    const payload: AutoDeleteUpdateRequest = { ...next, delete_delay_seconds: nextDelay };
    update.mutate(
      { channelId, data: payload },
      {
        onSuccess: () => showSuccess(successMsg),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const enabled = Object.values(flags).some(Boolean);

  const handleEnabledToggle = (next: boolean) => {
    const nextFlags: AutoDeleteFlags = next
      ? { ...ALL_OFF, delete_system_messages: true, delete_command_messages: true }
      : ALL_OFF;
    setFlags(nextFlags);
    send(nextFlags, delaySeconds, next ? 'Автоудаление включено' : 'Автоудаление отключено');
  };

  const handleTypeToggle = (typeId: string, value: boolean) => {
    const field = FIELD_BY_TYPE[typeId];
    if (!field) return;
    const nextFlags = { ...flags, [field]: value };
    setFlags(nextFlags);
    send(nextFlags, delaySeconds, 'Автоудаление обновлено');
  };

  const handleDelayChange = (value: number) => {
    setDelaySeconds(value);
    setOpenPicker(null);
    send(flags, value, 'Автоудаление обновлено');
  };

  const checked: Record<string, boolean> = {
    system: flags.delete_system_messages,
    commands: flags.delete_command_messages,
    join: flags.delete_join_messages,
    all: flags.delete_all_messages,
    textOnly: flags.delete_text_only,
    mediaOnly: flags.delete_media_only,
  };

  const selectedCount = Object.values(checked).filter(Boolean).length;
  const whatSummary = selectedCount === 0
    ? 'Не выбрано'
    : selectedCount === AUTO_DELETE_TYPES.length
      ? 'Всё'
      : AUTO_DELETE_TYPES.filter((t) => checked[t.id]).map((t) => t.label).join(', ');

  const delaySummary = AUTO_DELETE_DELAYS.find((d) => d.value === delaySeconds)?.label || 'Сразу';

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Автоудаление сообщений</span>
        <Toggle checked={enabled} onChange={handleEnabledToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <PickerRow
            label="Что удалять:"
            value={whatSummary}
            open={openPicker === 'autoDeleteWhat'}
            onToggle={() => setOpenPicker(openPicker === 'autoDeleteWhat' ? null : 'autoDeleteWhat')}
          />
          {openPicker === 'autoDeleteWhat' && (
            <div className={styles.pickerOptions}>
              {AUTO_DELETE_TYPES.map((t) => (
                <div key={t.id} className={styles.checkboxRow} onClick={() => handleTypeToggle(t.id, !checked[t.id])}>
                  <Checkbox
                    checked={checked[t.id]}
                    onChange={() => handleTypeToggle(t.id, !checked[t.id])}
                    label={t.label}
                  />
                </div>
              ))}
            </div>
          )}

          <PickerRow
            label="Таймер удаления:"
            value={delaySummary}
            open={openPicker === 'autoDeleteDelay'}
            onToggle={() => setOpenPicker(openPicker === 'autoDeleteDelay' ? null : 'autoDeleteDelay')}
          />
          {openPicker === 'autoDeleteDelay' && (
            <div className={styles.pickerOptions}>
              {AUTO_DELETE_DELAYS.map((d) => (
                <div key={d.value} className={styles.checkboxRow} onClick={() => handleDelayChange(d.value)}>
                  <Checkbox
                    variant="radio"
                    checked={delaySeconds === d.value}
                    onChange={() => handleDelayChange(d.value)}
                    label={d.label}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AutoDeleteBlock;
