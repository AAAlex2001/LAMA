'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { PlusIcon } from '@/components/icons';
import Input from '@/components/input/input';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../../store';
import {
  updateChannelTelegramThunk,
  uploadChannelPhotoThunk,
} from '../../store/thunks/channel-settings';
import type { Channel } from '@/types/channel';
import styles from './EditChannelModal.module.scss';

interface EditChannelModalProps {
  channel: Channel;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_DESCRIPTION = 255;

const EditChannelModal: FC<EditChannelModalProps> = ({ channel, isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(channel.title || '');
  const [description, setDescription] = useState(channel.description || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(channel.photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(channel.title || '');
      setDescription(channel.description || '');
      setPhotoPreview(channel.photo_url || null);
      setPhotoFile(null);
    }
  }, [isOpen, channel]);

  const handlePhotoSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (photoFile) {
        await dispatch(uploadChannelPhotoThunk({ channelId: channel.id, file: photoFile })).unwrap();
      }

      const titleChanged = title !== channel.title;
      const descChanged = description !== (channel.description || '');
      if (titleChanged || descChanged) {
        const data: { channelId: number; title?: string; description?: string } = { channelId: channel.id };
        if (titleChanged) data.title = title;
        if (descChanged) data.description = description;
        await dispatch(updateChannelTelegramThunk(data)).unwrap();
      }

      showSuccess('Канал обновлён');
      onClose();
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка обновления канала');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasPhoto = !!photoPreview;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.heading}>Редактирование канала</h3>

        <div className={styles.form}>
          {/* Photo */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Фото канала</span>
            <div
              className={styles.avatarWrap}
              onClick={handlePhotoSelect}
            >
              <div className={styles.avatarCircle}>
                {hasPhoto ? (
                  <img src={photoPreview!} alt="" className={styles.avatarImg} />
                ) : (
                  <PlusIcon width={16} height={16} color="#3B82F6" />
                )}
              </div>
              <span className={styles.avatarText}>
                {hasPhoto ? 'Изменить фото' : 'Добавить фото'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
          </div>

          {/* Title */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Название</span>
            <Input
              value={title}
              onChange={setTitle}
              placeholder={channel.title}
              variant="default"
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Описание канала</span>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                rows={3}
              />
              <span className={styles.counter}>
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="outline" intent="gradient" size="lg" onClick={onClose} className={styles.actionBtn}>
            Отмена
          </Button>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            onClick={handleSave}
            loading={saving}
            className={styles.actionBtn}
          >
            Сохранить изменения
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;
