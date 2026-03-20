'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { EditNameIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../../store';
import { updateChannelTelegramThunk } from '../../store/thunks/channel-settings';
import type { Channel } from '@/types/channel';
import { formatMembers } from '../utils';
import styles from './ChannelInfoCard.module.scss';

interface ChannelInfoCardProps {
  channel: Channel;
}

const ChannelInfoCard: FC<ChannelInfoCardProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const photoUrl = channel.photo_url || null;
  const initial = channel.title?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleEdit = () => {
    setDraft(channel.title || '');
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === channel.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateChannelTelegramThunk({ channelId: channel.id, title: trimmed })).unwrap();
      showSuccess('Название обновлено');
      setEditing(false);
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка обновления названия');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className={styles.info}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {photoUrl ? (
            <img src={photoUrl} alt={channel.title} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback}>{initial}</span>
          )}
        </div>
        <div className={styles.meta}>
          <div className={styles.titleRow}>
            {editing ? (
              <input
                ref={inputRef}
                className={styles.titleInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={saving}
              />
            ) : (
              <>
                <span className={styles.title}>{channel.title}</span>
                <button className={styles.editBtn} type="button" onClick={handleEdit}>
                  <EditNameIcon width={20} height={20} color="#CED2D6" />
                </button>
              </>
            )}
          </div>
          {channel.username && (
            <span className={styles.username}>@{channel.username}</span>
          )}
          <span className={styles.members}>{formatMembers(channel.members_count || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default ChannelInfoCard;
