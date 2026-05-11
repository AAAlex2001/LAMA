'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { PlusIcon } from '@/components/icons';
import Input from '@/components/input/input';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Bot } from '@/store/bots';
import {
  useUpdateBotMutation,
  useUploadBotPhotoMutation,
  useDeleteBotPhotoMutation,
} from '@/store/bots';
import styles from './EditBotModal.module.scss';

interface EditBotModalProps {
  bot: Bot;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_DESCRIPTION = 512;

const EditBotModal: FC<EditBotModalProps> = ({ bot, isOpen, onClose }) => {
  const { showSuccess, showError } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateBot = useUpdateBotMutation();
  const uploadPhoto = useUploadBotPhotoMutation();
  const deletePhoto = useDeleteBotPhotoMutation();

  const [name, setName] = useState(bot.first_name || bot.title || '');
  const [description, setDescription] = useState(bot.description || '');
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(bot.photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(bot.first_name || bot.title || '');
      setDescription(bot.description || '');
      setPhotoPreview(bot.photo_url || null);
      setPhotoFile(null);
      setPhotoRemoved(false);
    }
  }, [isOpen, bot]);

  const handlePhotoSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoRemoved(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (photoFile) {
        await uploadPhoto.mutateAsync({ botId: bot.id, file: photoFile });
      } else if (photoRemoved && bot.photo_url) {
        await deletePhoto.mutateAsync(bot.id);
      }

      const data: { name?: string; description?: string } = {};
      if (name !== (bot.first_name || bot.title || '')) data.name = name;
      if (description !== (bot.description || '')) data.description = description;

      if (Object.keys(data).length > 0) {
        await updateBot.mutateAsync({ botId: bot.id, data });
      }

      showSuccess('Бот обновлён');
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка обновления бота');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasPhoto = !!photoPreview;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.heading}>Редактирование бота</h3>

        <div className={styles.form}>
          <div className={`${styles.field} ${styles.avatarField}`}>
            <span className={styles.fieldLabel}>Фото бота</span>
            <div className={styles.avatarWrap} onClick={handlePhotoSelect}>
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

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Название</span>
            <Input
              value={name}
              onChange={setName}
              placeholder={bot.first_name || bot.username}
              variant="default"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Описание бота</span>
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

export default EditBotModal;
