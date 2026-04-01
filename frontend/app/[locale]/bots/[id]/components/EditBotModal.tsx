'use client';

import { FC, useState, useEffect } from 'react';
import Input from '@/components/input/input';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Bot } from '@/store/bots';
import { updateBotThunk } from '@/store/bots';
import { useAppDispatch } from '../../store';
import styles from './EditBotModal.module.scss';

interface EditBotModalProps {
  bot: Bot;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_DESCRIPTION = 512;

const EditBotModal: FC<EditBotModalProps> = ({ bot, isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [name, setName] = useState(bot.first_name || bot.title || '');
  const [description, setDescription] = useState(bot.description || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(bot.first_name || bot.title || '');
      setDescription(bot.description || '');
    }
  }, [isOpen, bot]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: { name?: string; description?: string } = {};
      if (name !== (bot.first_name || bot.title || '')) data.name = name;
      if (description !== (bot.description || '')) data.description = description;

      if (Object.keys(data).length > 0) {
        await dispatch(updateBotThunk({ botId: bot.id, data })).unwrap();
      }
      showSuccess('Бот обновлён');
      onClose();
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка обновления бота');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.heading}>Редактирование бота</h3>

        <div className={styles.form}>
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
