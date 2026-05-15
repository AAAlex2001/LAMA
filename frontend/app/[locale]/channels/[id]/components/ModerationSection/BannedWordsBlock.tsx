'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { PlusIcon, TrashIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useBannedWordsQuery,
  useToggleBannedWordsMutation,
  useAddBannedWordMutation,
  useDeleteBannedWordMutation,
  useBulkUpdateBannedWordsActionMutation,
} from '@/store/channels';
import { BANNED_ACTIONS } from './constants';
import { formatDuration, minutesToParts, partsToMinutes, splitColumns } from './helpers';
import PickerRow from './PickerRow';
import TimeMutePicker from './TimeMutePicker';
import styles from '../ModerationSection.module.scss';

interface BannedWordsBlockProps {
  channelId: number;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

type BannedAction = 'BAN' | 'MUTE' | 'KICK';

const BannedWordsBlock: FC<BannedWordsBlockProps> = ({ channelId, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useBannedWordsQuery(channelId);
  const toggleEnabled = useToggleBannedWordsMutation();
  const addWord = useAddBannedWordMutation();
  const deleteWord = useDeleteBannedWordMutation();
  const bulkUpdateAction = useBulkUpdateBannedWordsActionMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [action, setAction] = useState<BannedAction>('BAN');
  const [muteMinutes, setMuteMinutes] = useState(60);
  const [input, setInput] = useState('');

  const enabled = query.data?.enabled ?? false;
  const rules = query.data?.rules ?? [];

  useEffect(() => {
    if (rules.length > 0) {
      const first = rules[0];
      setAction((first.action as BannedAction) || 'BAN');
      setMuteMinutes(first.mute_duration_minutes ?? 60);
    }
  }, [rules]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleToggle = (next: boolean) => {
    toggleEnabled.mutate(
      { channelId, enabled: next },
      {
        onSuccess: () => showSuccess(next ? 'Запрещённые слова включены' : 'Запрещённые слова отключены'),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const sendActionDebounced = (nextAction: BannedAction, nextMute: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const ruleIds = rules.map((r) => r.id);
      if (ruleIds.length === 0) return;
      bulkUpdateAction.mutate(
        {
          channelId,
          ruleIds,
          data: {
            action: nextAction,
            mute_duration_minutes: nextAction === 'MUTE' ? nextMute || 1 : null,
          },
        },
        {
          onSuccess: () => showSuccess('Действие обновлено'),
          onError: () => showError('Ошибка сохранения'),
        },
      );
    }, 800);
  };

  const handleActionChange = (next: BannedAction) => {
    setAction(next);
    setOpenPicker(null);
    sendActionDebounced(next, muteMinutes);
  };

  const handleMuteChange = (days: number, hours: number, mins: number) => {
    const total = partsToMinutes(days, hours, mins);
    setMuteMinutes(total);
    sendActionDebounced(action, total);
  };

  const handleAdd = () => {
    const phrase = input.trim();
    if (!phrase) return;
    addWord.mutate(
      {
        channelId,
        data: {
          phrase,
          action,
          mute_duration_minutes: action === 'MUTE' ? muteMinutes || 1 : null,
        },
      },
      {
        onSuccess: () => {
          showSuccess('Слово добавлено');
          setInput('');
        },
        onError: () => showError('Ошибка добавления'),
      },
    );
  };

  const handleDelete = (ruleId: number) => {
    deleteWord.mutate(
      { channelId, ruleId },
      {
        onSuccess: () => showSuccess('Слово удалено'),
        onError: () => showError('Ошибка удаления'),
      },
    );
  };

  const muteParts = minutesToParts(muteMinutes);
  const actionLabel = BANNED_ACTIONS.find((a) => a.id === action)?.label || 'Ограничить';
  const actionSummary = action === 'MUTE'
    ? `${actionLabel} на ${formatDuration(muteMinutes)}`
    : actionLabel;
  const { left, right } = splitColumns(rules);

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Запрещенные слова</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <PickerRow
            label="При наличии"
            value={actionSummary}
            open={openPicker === 'bannedAction'}
            onToggle={() => setOpenPicker(openPicker === 'bannedAction' ? null : 'bannedAction')}
          />
          {openPicker === 'bannedAction' && (
            <div className={styles.pickerOptions}>
              {BANNED_ACTIONS.map((a) => (
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

          <div className={styles.bannedWordsInputRow}>
            <input
              type="text"
              className={styles.bannedWordsInput}
              placeholder="Введите слово или фразу"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <button type="button" className={styles.bannedWordsAddBtn} onClick={handleAdd} disabled={addWord.isPending}>
              <PlusIcon width={16} height={16} color="#3B82F6" />
            </button>
          </div>

          {rules.length > 0 && (
            <div className={styles.bannedWordsGrid}>
              {[left, right].map((col, ci) => (
                <div key={ci} className={styles.bannedWordsColumn}>
                  {col.map((rule) => (
                    <div key={rule.id} className={styles.bannedWordItem}>
                      <span className={styles.bannedWordDot} />
                      <span className={styles.bannedWordText}>{rule.phrase}</span>
                      <button type="button" className={styles.bannedWordDelete} onClick={() => handleDelete(rule.id)}>
                        <TrashIcon width={15} height={17} color="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default BannedWordsBlock;
