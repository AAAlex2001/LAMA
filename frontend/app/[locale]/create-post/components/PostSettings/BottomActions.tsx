'use client';

import { FC } from 'react';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { AdToggleSection } from '@/components/ad-toggle-section';
import { useAppDispatch, useAppSelector } from '../../store';
import * as settingsSlice from '../../store/slices/settings';
import { clearSelectedChannels } from '../../store/slices/channelsSelection';
import { resetDatePicker } from '../../store/slices/datePicker';
import styles from './PostSettings.module.scss';

interface BottomActionsProps {
  onPreview?: () => void;
  previewDisabled?: boolean;
}

const BottomActions: FC<BottomActionsProps> = ({ onPreview, previewDisabled }) => {
  const dispatch = useAppDispatch();
  const notifySubscribers = useAppSelector((s) => s.settings.notifySubscribers);
  const pinPost = useAppSelector((s) => s.settings.pinPost);
  const ad = useAppSelector((s) => s.settings.ad);

  const handleReset = () => {
    dispatch(settingsSlice.resetSettings());
    dispatch(clearSelectedChannels());
    dispatch(resetDatePicker());
  };

  return (
    <div className={styles.settingsBottom}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Уведомлять подписчиков</span>
        <Toggle
          checked={notifySubscribers}
          onChange={(v) => dispatch(settingsSlice.setNotifySubscribers(v))}
        />
      </div>

      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Закрепить пост после публикации</span>
        <Toggle
          checked={pinPost}
          onChange={(v) => dispatch(settingsSlice.setPinPost(v))}
        />
      </div>

      <AdToggleSection value={ad} onChange={(v) => dispatch(settingsSlice.setAdSettings(v))} />

      <div className={styles.settingsButtons}>
        <Button
          intent="gradient"
          size="lg"
          style={{ width: '100%' }}
          onClick={onPreview}
          disabled={previewDisabled}
        >
          Предпросмотр поста
        </Button>
        <Button
          variant="soft"
          intent="neutral"
          size="lg"
          style={{ width: '100%' }}
          onClick={handleReset}
        >
          Сбросить настройки
        </Button>
      </div>
    </div>
  );
};

export default BottomActions;
