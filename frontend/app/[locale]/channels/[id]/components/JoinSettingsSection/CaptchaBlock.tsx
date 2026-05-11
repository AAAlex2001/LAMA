'use client';

import { FC, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import WheelPicker from '@/components/wheel-picker/wheel-picker';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useCaptchaSettingsQuery,
  useUpdateCaptchaSettingsMutation,
  useAutoApprovalQuery,
  type CaptchaFailAction as CaptchaFailActionType,
} from '@/store/channels';
import CaptchaSettingsModal from '../CaptchaSettingsModal';
import { TIMEOUT_OPTIONS, FAIL_ACTION_OPTIONS, RESTRICTION_OPTIONS } from './constants';
import { ChevronPickerIcon, formatDuration } from './helpers';
import styles from '../JoinSettingsSection.module.scss';

interface CaptchaBlockProps {
  channelId: number;
  botId: number;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

type CaptchaUpdateData = Partial<{
  captcha_timeout_seconds: number;
  captcha_fail_action: CaptchaFailActionType;
  captcha_fail_duration_seconds: number;
  captcha_restriction_type: string;
}>;

const CaptchaBlock: FC<CaptchaBlockProps> = ({ channelId, botId, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const captchaQuery = useCaptchaSettingsQuery(channelId);
  const updateCaptcha = useUpdateCaptchaSettingsMutation();
  const approvalQuery = useAutoApprovalQuery(botId);
  const hasRequiredChannels = (approvalQuery.data?.approval_criteria?.required_channels?.length ?? 0) > 0;
  const [modalOpen, setModalOpen] = useState(false);

  const captchaEnabled = captchaQuery.data?.captcha_enabled ?? false;
  const captchaTimeoutSeconds = captchaQuery.data?.captcha_timeout_seconds ?? 30;
  const captchaFailAction = (captchaQuery.data?.captcha_fail_action ?? 'KICK') as CaptchaFailActionType;
  const captchaFailDurationSeconds = captchaQuery.data?.captcha_fail_duration_seconds ?? 3600;
  const captchaRestrictionType = captchaQuery.data?.captcha_restriction_type ?? 'send_messages';
  const loaded = captchaQuery.isSuccess;
  const saving = updateCaptcha.isPending;

  const handleToggle = async (checked: boolean) => {
    try {
      await updateCaptcha.mutateAsync({ channelId, data: { captcha_enabled: checked } });
      showSuccess(checked ? 'Капча включена' : 'Капча выключена');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleUpdate = async (data: CaptchaUpdateData) => {
    try {
      await updateCaptcha.mutateAsync({ channelId, data });
      showSuccess('Настройки капчи обновлены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handlePickerChange = async (field: 'timeout' | 'failAction' | 'restriction', value: number | string) => {
    let data: CaptchaUpdateData = {};
    if (field === 'timeout') data = { captcha_timeout_seconds: value as number };
    else if (field === 'failAction') data = { captcha_fail_action: value as CaptchaFailActionType };
    else if (field === 'restriction') data = { captcha_restriction_type: value as string };
    await handleUpdate(data);
  };

  const showFailDuration = captchaFailAction === 'MUTE';
  const failDurationSeconds = Math.min(captchaFailDurationSeconds ?? 3600, 86400);
  const failDurHours = Math.floor(failDurationSeconds / 3600);
  const failDurMinutes = Math.floor((failDurationSeconds % 3600) / 60);

  const handleFailDurChange = async (hours: number, mins: number) => {
    const total = Math.min(hours * 3600 + mins * 60, 86400) || 60;
    await handleUpdate({ captcha_fail_duration_seconds: total });
  };

  const timeoutSummary = TIMEOUT_OPTIONS.find((o) => o.value === captchaTimeoutSeconds)?.label || '30 секунд';
  const failActionSummary = (() => {
    const label = FAIL_ACTION_OPTIONS.find((o) => o.value === captchaFailAction)?.label || 'Кикнуть';
    if (captchaFailAction === 'MUTE' && captchaFailDurationSeconds) {
      return `${label} ${formatDuration(captchaFailDurationSeconds)}`;
    }
    return label;
  })();
  const restrictionSummary = RESTRICTION_OPTIONS.find((o) => o.value === captchaRestrictionType)?.label || 'Ограничить отправку сообщений';

  if (hasRequiredChannels) return null;

  return (
    <div className={styles.column}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Капча для новых участников</span>
        <Toggle
          checked={captchaEnabled}
          onChange={handleToggle}
          disabled={saving || !loaded}
        />
      </div>
      <span className={styles.captchaDescription}>
        Математический пример (N + M), который нужно решить для входа в группу
      </span>

      {captchaEnabled && (
        <div className={styles.captchaSettings}>
          <div
            className={styles.pickerRow}
            onClick={() => setOpenPicker(openPicker === 'timeout' ? null : 'timeout')}
          >
            <span className={styles.pickerLabel}>Время на ответ</span>
            <div className={styles.pickerRight}>
              <span className={styles.pickerValueText}>{timeoutSummary}</span>
              <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'timeout' ? styles.pickerChevronOpen : ''}`} />
            </div>
          </div>
          {openPicker === 'timeout' && (
            <div className={styles.pickerOptions}>
              {TIMEOUT_OPTIONS.map((opt) => (
                <div key={opt.value} className={styles.checkboxRow} onClick={() => { handlePickerChange('timeout', opt.value); setOpenPicker(null); }}>
                  <Checkbox
                    variant="radio"
                    checked={opt.value === captchaTimeoutSeconds}
                    onChange={() => { handlePickerChange('timeout', opt.value); setOpenPicker(null); }}
                    label={opt.label}
                  />
                </div>
              ))}
            </div>
          )}

          <div
            className={styles.pickerRow}
            onClick={() => setOpenPicker(openPicker === 'failAction' ? null : 'failAction')}
          >
            <span className={styles.pickerLabel}>Действие при провале</span>
            <div className={styles.pickerRight}>
              <span className={styles.pickerValueText}>{failActionSummary}</span>
              <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'failAction' ? styles.pickerChevronOpen : ''}`} />
            </div>
          </div>
          {openPicker === 'failAction' && (
            <div className={styles.pickerOptions}>
              {FAIL_ACTION_OPTIONS.map((opt) => (
                <div key={opt.value} className={styles.checkboxRow} onClick={() => { handlePickerChange('failAction', opt.value); setOpenPicker(null); }}>
                  <Checkbox
                    variant="radio"
                    checked={opt.value === captchaFailAction}
                    onChange={() => { handlePickerChange('failAction', opt.value); setOpenPicker(null); }}
                    label={opt.label}
                  />
                </div>
              ))}
            </div>
          )}

          {showFailDuration && (
            <div className={styles.timePicker}>
              <div className={styles.timeHeader}>
                <span className={styles.timeLabel}>Длительность:</span>
                <span className={styles.timeValue}>{formatDuration(failDurationSeconds)}</span>
              </div>
              <div className={styles.timeWheelWrapper}>
                <div className={styles.timeLabelsRow}>
                  <span className={styles.timeLabelUnit}>часов</span>
                  <span className={styles.timeLabelUnit}>минут</span>
                </div>
                <div className={styles.timeWheel}>
                  <WheelPicker value={failDurHours} onChange={(v) => handleFailDurChange(v, failDurMinutes)} min={0} max={24} />
                  <WheelPicker value={failDurMinutes} onChange={(v) => handleFailDurChange(failDurHours, v)} min={0} max={59} />
                </div>
              </div>
              <div className={styles.timePresetsRow}>
                <div className={styles.timePresetsList}>
                  <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 3600 ? styles.active : ''}`}
                    onClick={() => handleFailDurChange(1, 0)}>
                    1 час
                  </button>
                  <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 43200 ? styles.active : ''}`}
                    onClick={() => handleFailDurChange(12, 0)}>
                    12 часов
                  </button>
                  <button type="button" className={`${styles.timePreset} ${failDurationSeconds === 86400 ? styles.active : ''}`}
                    onClick={() => handleFailDurChange(24, 0)}>
                    24 часа
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={styles.pickerRow}
            onClick={() => setOpenPicker(openPicker === 'restriction' ? null : 'restriction')}
          >
            <span className={styles.pickerLabel}>Ограничение</span>
            <div className={styles.pickerRight}>
              <span className={styles.pickerValueText}>{restrictionSummary}</span>
              <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'restriction' ? styles.pickerChevronOpen : ''}`} />
            </div>
          </div>
          {openPicker === 'restriction' && (
            <div className={styles.pickerOptions}>
              {RESTRICTION_OPTIONS.map((opt) => (
                <div key={opt.value} className={styles.checkboxRow} onClick={() => { handlePickerChange('restriction', opt.value); setOpenPicker(null); }}>
                  <Checkbox
                    variant="radio"
                    checked={opt.value === captchaRestrictionType}
                    onChange={() => { handlePickerChange('restriction', opt.value); setOpenPicker(null); }}
                    label={opt.label}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            variant="fill"
            intent="gradient"
            size="md"
            className={styles.configButton}
            onClick={() => setModalOpen(true)}
          >
            Настройка капчи
          </Button>
        </div>
      )}

      <CaptchaSettingsModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        channelId={channelId}
      />
    </div>
  );
};

export default CaptchaBlock;
