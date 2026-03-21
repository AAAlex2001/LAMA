'use client';

import { FC, useState, useEffect } from 'react';
import DeleteConfirmationModal from '@/components/modal/modal';
import Checkbox from '@/components/checkbox/checkbox';
import { Button } from '@/components/new-button';
import { apiRequest } from '@/store/api';
import type { Channel } from '@/types/channel';
import styles from './ExportModal.module.scss';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contentTypes: string[]) => void;
  channel: Channel;
}

const CONTENT_TYPE_LEFT = [
  { id: 'photo', label: 'Фотографии' },
  { id: 'video', label: 'Видеозаписи' },
  { id: 'animation', label: 'Гифки' },
];

const CONTENT_TYPE_RIGHT = [
  { id: 'document', label: 'Файлы' },
  { id: 'text', label: 'Текст' },
];

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} гб`;
  if (mb >= 1) return `${mb.toFixed(1)} мб`;
  return `${Math.round(mb * 1024)} кб`;
}

const ExportModal: FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, channel }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [sizeMb, setSizeMb] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTypes([]);

    apiRequest<{ total_backed_up_posts: number; backup_size_mb: number }>(`/channels/${channel.id}/stats`)
      .then((s) => {
        setTotalPosts(s.total_backed_up_posts);
        setSizeMb(s.backup_size_mb);
      })
      .catch(() => {});
  }, [isOpen, channel.id]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedTypes);
    onClose();
  };

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Скачать архив?"
      hideButtons
    >
      <div className={styles.body}>
        <div className={styles.contentTypes}>
          <span className={styles.label}>Настройки экспорта:</span>
          <div className={styles.grid}>
            <div className={styles.col}>
              {CONTENT_TYPE_LEFT.map((ct) => (
                <div key={ct.id} className={styles.checkboxItem} onClick={() => toggleType(ct.id)}>
                  <Checkbox checked={selectedTypes.includes(ct.id)} onChange={() => toggleType(ct.id)} label={ct.label} />
                </div>
              ))}
            </div>
            <div className={styles.col}>
              {CONTENT_TYPE_RIGHT.map((ct) => (
                <div key={ct.id} className={styles.checkboxItem} onClick={() => toggleType(ct.id)}>
                  <Checkbox checked={selectedTypes.includes(ct.id)} onChange={() => toggleType(ct.id)} label={ct.label} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.info}>
          <span>Количество публикаций: {totalPosts}</span>
          <span>Вес файла: {formatSize(sizeMb)}</span>
        </div>

        <div className={styles.buttons}>
          <Button variant="outline" intent="gradient" size="md" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="fill" intent="gradient" size="md" onClick={handleConfirm} className={styles.confirmBtn}>
            Скачать
          </Button>
        </div>
      </div>
    </DeleteConfirmationModal>
  );
};

export default ExportModal;
