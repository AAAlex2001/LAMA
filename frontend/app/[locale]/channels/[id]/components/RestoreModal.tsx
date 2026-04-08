'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import DeleteConfirmationModal from '@/components/modal/modal';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';
import DatePicker from '@/components/date-picker/date-picker';
import { Button } from '@/components/new-button';
import { apiRequest } from '@/store/api';
import type { Channel } from '@/types/channel';
import styles from './RestoreModal.module.scss';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contentTypes: string[], dateRange: { start: Date; end: Date } | null) => void;
  channel: Channel;
  targetChannelName: string;
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

function formatEstimatedTime(postCount: number): string {
  const totalSeconds = postCount * 3;
  if (totalSeconds < 60) return `~ ${totalSeconds} сек`;
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `~ ${minutes} мин`;
  const remainMinutes = minutes % 60;
  if (remainMinutes === 0) return `~ ${hours} ч`;
  return `~ ${hours} ч ${remainMinutes} мин`;
}

const RestoreModal: FC<RestoreModalProps> = ({ isOpen, onClose, onConfirm, channel, targetChannelName }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [totalPosts, setTotalPosts] = useState(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTypes([]);
    setCalendarOpen(false);
    setDraftStart(null);
    setDraftEnd(null);

    apiRequest<Record<string, number>>(`/channels/${channel.id}/backup-day-counts`)
      .then(setPostCounts)
      .catch(() => {});

    apiRequest<{ total_backed_up_posts: number }>(`/channels/${channel.id}/stats`)
      .then((s) => setTotalPosts(s.total_backed_up_posts))
      .catch(() => {});
  }, [isOpen, channel.id]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const dateRangeLabel = useMemo(() => {
    if (!draftStart || !draftEnd) return 'За весь период';
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    if (draftStart.getTime() === draftEnd.getTime()) return fmt(draftStart);
    return `${fmt(draftStart)} — ${fmt(draftEnd)}`;
  }, [draftStart, draftEnd]);

  const selectedDateKeys = useMemo(() => {
    if (!draftStart) return [];
    if (!draftEnd) {
      return [`${draftStart.getFullYear()}-${String(draftStart.getMonth() + 1).padStart(2, '0')}-${String(draftStart.getDate()).padStart(2, '0')}`];
    }
    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;
    const keys: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endAt = new Date(end);
    endAt.setHours(0, 0, 0, 0);
    while (cursor <= endAt) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }, [draftStart, draftEnd]);

  const handleDatePick = (date: Date) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }
    if (date.getTime() >= draftStart.getTime()) {
      setDraftEnd(date);
    } else {
      setDraftEnd(draftStart);
      setDraftStart(date);
    }
  };

  const handleConfirm = () => {
    const range = draftStart && draftEnd ? { start: draftStart, end: draftEnd } : null;
    onConfirm(selectedTypes, range);
    onClose();
  };

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Восстановить архив?"
      description="Это создаст копии постов в выбранном канале"
      hideButtons
    >
      <div className={styles.body}>
        <div className={styles.contentTypes}>
          <span className={styles.label}>Настройки восстановления:</span>
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

        <button type="button" className={styles.selectorRow} onClick={() => setCalendarOpen(!calendarOpen)}>
          <span className={styles.selectorLabel}>Дата: {dateRangeLabel}</span>
          <ChevronDownIcon width={16} height={16} color="#000000" />
        </button>

        {calendarOpen && (
          <div className={styles.calendarWrap}>
            <DatePicker
              value={draftEnd || draftStart || new Date()}
              onChange={handleDatePick}
              locale="ru"
              minDate={null}
              selectedDateKeys={selectedDateKeys}
              rangeSelection
              postCounts={postCounts}
            />
          </div>
        )}

        <div className={styles.info}>
          <span>Получатель: {targetChannelName}</span>
          <span>Количество публикаций: {totalPosts}</span>
          <span>Время восстановления: {formatEstimatedTime(totalPosts)}</span>
        </div>

        <div className={styles.buttons}>
          <Button variant="outline" intent="gradient" size="md" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="fill" intent="gradient" size="md" onClick={handleConfirm} className={styles.confirmBtn}>
            Восстановить
          </Button>
        </div>
      </div>
    </DeleteConfirmationModal>
  );
};

export default RestoreModal;
