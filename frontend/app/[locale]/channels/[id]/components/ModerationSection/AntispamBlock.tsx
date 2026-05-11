'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import PlusIcon from '@/components/icons/plus-icon';
import TrashIcon from '@/components/icons/trash-icon';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useAntispamQuery,
  useUpdateAntispamMutation,
  type AntispamMode,
  type AntispamAction,
  type AntispamUpdateRequest,
} from '@/store/channels';
import { ANTISPAM_MODES, ANTISPAM_ACTIONS } from './constants';
import { formatDuration, minutesToParts, partsToMinutes, splitColumns } from './helpers';
import PickerRow from './PickerRow';
import TimeMutePicker from './TimeMutePicker';
import styles from '../ModerationSection.module.scss';

interface AntispamBlockProps {
  channelId: number;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

const AntispamBlock: FC<AntispamBlockProps> = ({ channelId, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useAntispamQuery(channelId);
  const update = useUpdateAntispamMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [mode, setMode] = useState<AntispamMode>('DISABLED');
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [action, setAction] = useState<AntispamAction>('BAN');
  const [muteMinutes, setMuteMinutes] = useState(60);
  const [urlInput, setUrlInput] = useState('');
  const loaded = query.isSuccess;

  useEffect(() => {
    if (query.data) {
      setMode(query.data.link_filter_mode);
      setWhitelist(query.data.link_whitelist ?? []);
      setBlacklist(query.data.link_blacklist ?? []);
      setAction(query.data.link_filter_action);
      setMuteMinutes(query.data.link_filter_mute_duration ?? 60);
    }
  }, [query.data]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const buildPayload = (overrides: Partial<{
    mode: AntispamMode;
    whitelist: string[];
    blacklist: string[];
    action: AntispamAction;
    muteMinutes: number;
  }> = {}): AntispamUpdateRequest => {
    const a = overrides.action ?? action;
    return {
      link_filter_mode: overrides.mode ?? mode,
      link_whitelist: overrides.whitelist ?? whitelist,
      link_blacklist: overrides.blacklist ?? blacklist,
      link_filter_action: a,
      link_filter_mute_duration: a === 'MUTE' ? (overrides.muteMinutes ?? muteMinutes) || 1 : null,
    };
  };

  const sendNow = (data: AntispamUpdateRequest, successMsg: string) => {
    update.mutate(
      { channelId, data },
      {
        onSuccess: () => showSuccess(successMsg),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const sendDebounced = (data: AntispamUpdateRequest, successMsg: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => sendNow(data, successMsg), 800);
  };

  const enabled = mode !== 'DISABLED';

  const handleToggle = (next: boolean) => {
    const nextMode: AntispamMode = next ? 'BLOCK_ALL' : 'DISABLED';
    setMode(nextMode);
    sendNow(buildPayload({ mode: nextMode }), next ? 'Антиспам включён' : 'Антиспам отключён');
  };

  const handleModeChange = (next: AntispamMode) => {
    setMode(next);
    setOpenPicker(null);
    sendDebounced(buildPayload({ mode: next }), 'Настройки антиспама сохранены');
  };

  const handleAddToList = () => {
    const url = urlInput.trim();
    if (!url) return;
    let nextWhitelist = whitelist;
    let nextBlacklist = blacklist;
    if (mode === 'WHITELIST') {
      nextWhitelist = [...whitelist, url];
      setWhitelist(nextWhitelist);
    } else if (mode === 'BLACKLIST') {
      nextBlacklist = [...blacklist, url];
      setBlacklist(nextBlacklist);
    }
    setUrlInput('');
    sendDebounced(buildPayload({ whitelist: nextWhitelist, blacklist: nextBlacklist }), 'Настройки антиспама сохранены');
  };

  const handleRemoveFromWhitelist = (url: string) => {
    const next = whitelist.filter((u) => u !== url);
    setWhitelist(next);
    sendDebounced(buildPayload({ whitelist: next }), 'Настройки антиспама сохранены');
  };

  const handleRemoveFromBlacklist = (url: string) => {
    const next = blacklist.filter((u) => u !== url);
    setBlacklist(next);
    sendDebounced(buildPayload({ blacklist: next }), 'Настройки антиспама сохранены');
  };

  const handleActionChange = (next: AntispamAction) => {
    setAction(next);
    setOpenPicker(null);
    sendDebounced(buildPayload({ action: next }), 'Настройки антиспама сохранены');
  };

  const handleMuteChange = (days: number, hours: number, mins: number) => {
    const total = partsToMinutes(days, hours, mins);
    setMuteMinutes(total);
    sendDebounced(buildPayload({ muteMinutes: total }), 'Настройки антиспама сохранены');
  };

  const activeList = mode === 'WHITELIST' ? whitelist : blacklist;
  const showUrlList = mode === 'WHITELIST' || mode === 'BLACKLIST';
  const muteParts = minutesToParts(muteMinutes);
  const modeSummary = ANTISPAM_MODES.find((m) => m.id === mode)?.label || 'Запретить все ссылки';
  const actionLabel = ANTISPAM_ACTIONS.find((a) => a.id === action)?.label || 'Удалить сообщение';
  const actionSummary = action === 'MUTE'
    ? `${actionLabel} на ${formatDuration(muteMinutes)}`
    : actionLabel;
  const { left: leftUrl, right: rightUrl } = splitColumns(activeList);

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Антиспам</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && loaded && (
        <div className={styles.expandedContent}>
          <PickerRow
            label="Режим"
            value={modeSummary}
            open={openPicker === 'antispamMode'}
            onToggle={() => setOpenPicker(openPicker === 'antispamMode' ? null : 'antispamMode')}
          />
          {openPicker === 'antispamMode' && (
            <div className={styles.pickerOptions}>
              {ANTISPAM_MODES.map((m) => (
                <div key={m.id} className={styles.checkboxRow} onClick={() => handleModeChange(m.id)}>
                  <Checkbox
                    variant="radio"
                    checked={mode === m.id}
                    onChange={() => handleModeChange(m.id)}
                    label={m.label}
                  />
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
                  placeholder={mode === 'WHITELIST' ? 'Добавить домен в белый список' : 'Добавить домен в чёрный список'}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddToList(); }}
                />
                <button type="button" className={styles.bannedWordsAddBtn} onClick={handleAddToList}>
                  <PlusIcon width={16} height={16} color="#3B82F6" />
                </button>
              </div>

              {activeList.length > 0 && (
                <div className={styles.bannedWordsGrid}>
                  {[leftUrl, rightUrl].map((col, ci) => (
                    <div key={ci} className={styles.bannedWordsColumn}>
                      {col.map((url) => (
                        <div key={url} className={styles.bannedWordItem}>
                          <span className={styles.bannedWordDot} />
                          <span className={styles.bannedWordText}>{url}</span>
                          <button
                            type="button"
                            className={styles.bannedWordDelete}
                            onClick={() => mode === 'WHITELIST' ? handleRemoveFromWhitelist(url) : handleRemoveFromBlacklist(url)}
                          >
                            <TrashIcon width={15} height={17} color="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <PickerRow
            label="При наличии"
            value={actionSummary}
            open={openPicker === 'antispamAction'}
            onToggle={() => setOpenPicker(openPicker === 'antispamAction' ? null : 'antispamAction')}
          />
          {openPicker === 'antispamAction' && (
            <div className={styles.pickerOptions}>
              {ANTISPAM_ACTIONS.map((a) => (
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

export default AntispamBlock;
