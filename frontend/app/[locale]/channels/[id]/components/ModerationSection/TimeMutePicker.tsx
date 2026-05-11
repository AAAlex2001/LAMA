import { FC } from 'react';
import WheelPicker from '@/components/wheel-picker/wheel-picker';
import { formatDuration, partsToMinutes } from './helpers';
import styles from '../ModerationSection.module.scss';

interface TimeMutePickerProps {
  days: number;
  hours: number;
  minutes: number;
  onChange: (days: number, hours: number, minutes: number) => void;
}

const TimeMutePicker: FC<TimeMutePickerProps> = ({ days, hours, minutes, onChange }) => {
  const total = partsToMinutes(days, hours, minutes);

  return (
    <div className={styles.timePicker}>
      <div className={styles.timeHeader}>
        <span className={styles.timeLabel}>Срок ограничения:</span>
        <span className={styles.timeValue}>{formatDuration(total)}</span>
      </div>
      <div className={styles.timeWheelWrapper}>
        <div className={styles.timeLabelsRow}>
          <span className={styles.timeLabelUnit}>дней</span>
          <span className={styles.timeLabelUnit}>часов</span>
          <span className={styles.timeLabelUnit}>минут</span>
        </div>
        <div className={styles.timeWheel}>
          <WheelPicker value={days} onChange={(v) => onChange(v, hours, minutes)} min={0} max={30} />
          <WheelPicker value={hours} onChange={(v) => onChange(days, v, minutes)} min={0} max={23} />
          <WheelPicker value={minutes} onChange={(v) => onChange(days, hours, v)} min={0} max={59} />
        </div>
      </div>
      <div className={styles.timePresetsRow}>
        <div className={styles.timePresetsList}>
          <button type="button" className={`${styles.timePreset} ${total === 1440 ? styles.active : ''}`}
            onClick={() => onChange(1, 0, 0)}>
            24 часа
          </button>
          <button type="button" className={`${styles.timePreset} ${total === 2880 ? styles.active : ''}`}
            onClick={() => onChange(2, 0, 0)}>
            48 часов
          </button>
          <button type="button" className={`${styles.timePreset} ${total === 0 ? styles.active : ''}`}
            onClick={() => onChange(0, 0, 0)}>
            Навсегда
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeMutePicker;
