'use client';

import { FC, useState } from 'react';
import { EditNameIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../../store';
import { updateChannelTelegramThunk } from '../../store/thunks/channel-settings';
import type { Channel } from '@/types/channel';
import styles from './DescriptionEditor.module.scss';

interface DescriptionEditorProps {
  channel: Channel;
}

const DescriptionEditor: FC<DescriptionEditorProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStart = () => {
    setDraft(channel.description || '');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(updateChannelTelegramThunk({ channelId: channel.id, description: draft })).unwrap();
      showSuccess('Описание обновлено');
      setEditing(false);
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка обновления описания');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.block}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Описание</span>
        <button className={styles.editBtn} type="button" onClick={handleStart}>
          <EditNameIcon width={16} height={16} color="#CED2D6" />
        </button>
      </div>
      {editing ? (
        <div className={styles.editWrap}>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className={styles.actions}>
            <button className={styles.cancelBtn} type="button" onClick={() => setEditing(false)}>
              Отмена
            </button>
            <button className={styles.saveBtn} type="button" onClick={handleSave} disabled={saving}>
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          <span className={styles.text}>{channel.description || 'Нет описания'}</span>
        </div>
      )}
    </div>
  );
};

export default DescriptionEditor;
