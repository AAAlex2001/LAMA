'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useUpdateNightModeMutation, type NightModeSettings } from '@/store/channels';
import type { Channel } from '@/types/channel';
import { NIGHT_BLOCK_OPTIONS } from './constants';
import PickerRow from './PickerRow';
import styles from '../ModerationSection.module.scss';

interface NightModeBlockProps {
  channel: Channel;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

type NightBlockType = 'text' | 'media' | 'all';

function deriveBlockType(media: boolean, text: boolean): NightBlockType {
  if (media && text) return 'all';
  if (media) return 'media';
  if (text) return 'text';
  return 'all';
}

const NightModeBlock: FC<NightModeBlockProps> = ({ channel, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const update = useUpdateNightModeMutation();

  const [enabled, setEnabled] = useState(channel.night_mode_enabled);
  const [start, setStart] = useState(channel.night_mode_start || '23:00');
  const [end, setEnd] = useState(channel.night_mode_end || '07:00');
  const [blockMedia, setBlockMedia] = useState(channel.night_mode_block_media);
  const [blockText, setBlockText] = useState(channel.night_mode_block_text);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setEnabled(channel.night_mode_enabled);
    setStart(channel.night_mode_start || '23:00');
    setEnd(channel.night_mode_end || '07:00');
    setBlockMedia(channel.night_mode_block_media);
    setBlockText(channel.night_mode_block_text);
  }, [channel.id, channel.night_mode_enabled, channel.night_mode_start, channel.night_mode_end, channel.night_mode_block_media, channel.night_mode_block_text]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const sendNow = (data: NightModeSettings, successMsg: string) => {
    update.mutate(
      { channelId: channel.id, data },
      {
        onSuccess: () => showSuccess(successMsg),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const sendDebounced = (data: NightModeSettings, successMsg: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => sendNow(data, successMsg), 800);
  };

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    sendNow({
      night_mode_enabled: next,
      night_mode_start: start,
      night_mode_end: end,
      night_mode_block_media: blockMedia,
      night_mode_block_text: blockText,
    }, next ? 'Ночной режим включён' : 'Ночной режим отключён');
  };

  const handleStartChange = (value: string) => {
    setStart(value);
    sendDebounced({
      night_mode_enabled: enabled,
      night_mode_start: value,
      night_mode_end: end,
      night_mode_block_media: blockMedia,
      night_mode_block_text: blockText,
    }, 'Ночной режим сохранён');
  };

  const handleEndChange = (value: string) => {
    setEnd(value);
    sendDebounced({
      night_mode_enabled: enabled,
      night_mode_start: start,
      night_mode_end: value,
      night_mode_block_media: blockMedia,
      night_mode_block_text: blockText,
    }, 'Ночной режим сохранён');
  };

  const handleBlockTypeChange = (type: NightBlockType) => {
    const nextMedia = type === 'media' || type === 'all';
    const nextText = type === 'text' || type === 'all';
    setBlockMedia(nextMedia);
    setBlockText(nextText);
    sendDebounced({
      night_mode_enabled: enabled,
      night_mode_start: start,
      night_mode_end: end,
      night_mode_block_media: nextMedia,
      night_mode_block_text: nextText,
    }, 'Ночной режим сохранён');
  };

  const blockType = deriveBlockType(blockMedia, blockText);
  const blockSummary = NIGHT_BLOCK_OPTIONS.find((o) => o.id === blockType)?.label || 'Все сообщения';

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Ночной режим</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <div className={styles.floodDescription}>
            <span>Ограничивать сообщения с </span>
            <input
              type="text"
              className={styles.floodInlineInput}
              style={{ width: 46 }}
              value={start}
              placeholder="23:00"
              maxLength={5}
              onChange={(e) => handleStartChange(e.target.value)}
            />
            <span> до </span>
            <input
              type="text"
              className={styles.floodInlineInput}
              style={{ width: 46 }}
              value={end}
              placeholder="07:00"
              maxLength={5}
              onChange={(e) => handleEndChange(e.target.value)}
            />
          </div>

          <PickerRow
            label="Что ограничивать:"
            value={blockSummary}
            open={openPicker === 'nightBlock'}
            onToggle={() => setOpenPicker(openPicker === 'nightBlock' ? null : 'nightBlock')}
          />
          {openPicker === 'nightBlock' && (
            <div className={styles.pickerOptions}>
              {NIGHT_BLOCK_OPTIONS.map((o) => (
                <div key={o.id} className={styles.checkboxRow} onClick={() => { handleBlockTypeChange(o.id); setOpenPicker(null); }}>
                  <Checkbox
                    variant="radio"
                    checked={blockType === o.id}
                    onChange={() => { handleBlockTypeChange(o.id); setOpenPicker(null); }}
                    label={o.label}
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

export default NightModeBlock;
