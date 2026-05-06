'use client';

import { useEffect, useState } from 'react';
import classnames from 'classnames';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Loader from '@/components/loader';
import { fetchPublicationsByStatus, PublicationCompact } from '../store/api';
import styles from './PostPickerModal.module.scss';

interface PostPickerModalProps {
  isOpen: boolean;
  source: 'calendar' | 'drafts';
  onClose: () => void;
  onSelect: (publication: PublicationCompact) => void;
}

const TITLE_BY_SOURCE: Record<PostPickerModalProps['source'], string> = {
  calendar: 'Выберите пост из календаря',
  drafts: 'Выберите черновик',
};

const STATUS_BY_SOURCE: Record<PostPickerModalProps['source'], 'published' | 'draft'> = {
  calendar: 'published',
  drafts: 'draft',
};

export default function PostPickerModal({ isOpen, source, onClose, onSelect }: PostPickerModalProps) {
  const [items, setItems] = useState<PublicationCompact[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    fetchPublicationsByStatus(STATUS_BY_SOURCE[source])
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [isOpen, source]);

  const handleConfirm = () => {
    const picked = items.find((it) => it.id === selectedId);
    if (!picked) return;
    onSelect(picked);
    onClose();
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="md" padding="md" className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{TITLE_BY_SOURCE[source]}</h3>
          <ModalBase.Close />
        </div>

        <div className={styles.list}>
          {loading && <Loader size={32} color="blue" />}
          {error && <div className={styles.empty}>{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>Нет постов</div>
          )}
          {!loading && !error && items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={classnames(styles.item, { [styles.itemActive]: selectedId === item.id })}
              onClick={() => setSelectedId(item.id)}
            >
              <span className={styles.itemText}>
                {(item.text || '').trim().slice(0, 100) || '(без текста)'}
              </span>
              <span className={styles.itemDate}>{formatDate(item)}</span>
            </button>
          ))}
        </div>

        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={selectedId === null}
          onClick={handleConfirm}
        >
          Прикрепить рекламный пост
        </Button>
      </ModalBase.Content>
    </ModalBase>
  );
}

function formatDate(item: PublicationCompact): string {
  const iso = item.published_time ?? item.scheduled_time;
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${String(d.getFullYear()).slice(-2)}`;
}
