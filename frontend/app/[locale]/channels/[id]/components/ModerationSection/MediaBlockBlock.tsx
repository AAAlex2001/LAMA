'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useMediaBlockQuery,
  useUpdateMediaBlockMutation,
} from '@/store/channels';
import { MEDIA_TYPES } from './constants';
import { splitColumns } from './helpers';
import styles from '../ModerationSection.module.scss';

interface MediaBlockBlockProps {
  channelId: number;
}

const MediaBlockBlock: FC<MediaBlockBlockProps> = ({ channelId }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useMediaBlockQuery(channelId);
  const update = useUpdateMediaBlockMutation();

  const [enabled, setEnabled] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (query.data) {
      const blocked = query.data.block_media_types ?? [];
      setEnabled(blocked.length > 0);
      setTypes(blocked);
    }
  }, [query.data]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const send = (next: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      update.mutate(
        { channelId, blockTypes: next },
        {
          onSuccess: () => showSuccess('Блокировка медиа обновлена'),
          onError: () => showError('Ошибка сохранения'),
        },
      );
    }, 500);
  };

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    if (!next) {
      setTypes([]);
      send([]);
    }
  };

  const handleTypeToggle = (typeId: string) => {
    const next = types.includes(typeId) ? types.filter((t) => t !== typeId) : [...types, typeId];
    setTypes(next);
    send(next);
  };

  const { left, right } = splitColumns(MEDIA_TYPES);

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Блокировка медиа</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <div className={styles.mediaGrid}>
            {[left, right].map((col, ci) => (
              <div key={ci} className={styles.mediaColumn}>
                {col.map((type) => (
                  <div key={type.id} className={styles.checkboxRow} onClick={() => handleTypeToggle(type.id)}>
                    <Checkbox
                      checked={types.includes(type.id)}
                      onChange={() => handleTypeToggle(type.id)}
                      label={type.label}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MediaBlockBlock;
