'use client';

import { FC, useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useCaptchaSettingsQuery,
  useUpdateCaptchaSettingsMutation,
} from '@/store/channels';
import styles from './CaptchaSettingsModal.module.scss';

interface CaptchaSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
}

const SHORTCODES = [
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{user.username}', label: '{username}' },
  { code: '{date}', label: '{date}' },
];

const CaptchaSettingsModal: FC<CaptchaSettingsModalProps> = ({
  isOpen,
  onOpenChange,
  channelId,
}) => {
  const { showSuccess, showError } = useNotifications();
  const captchaQuery = useCaptchaSettingsQuery(channelId);
  const updateCaptcha = useUpdateCaptchaSettingsMutation();

  const captchaMessageBefore = captchaQuery.data?.captcha_message_before ?? null;
  const captchaMessageFail = captchaQuery.data?.captcha_message_fail ?? null;
  const captchaMessageSuccess = captchaQuery.data?.captcha_message_success ?? null;
  const saving = updateCaptcha.isPending;

  const [before, setBefore] = useState(captchaMessageBefore || '');
  const [fail, setFail] = useState(captchaMessageFail || '');
  const [success, setSuccess] = useState(captchaMessageSuccess || '');

  const beforeRef = useRef<HTMLTextAreaElement>(null);
  const failRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLTextAreaElement>(null);

  const [activeField, setActiveField] = useState<'before' | 'fail' | 'success' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBefore(captchaMessageBefore || '');
      setFail(captchaMessageFail || '');
      setSuccess(captchaMessageSuccess || '');
    }
  }, [isOpen, captchaMessageBefore, captchaMessageFail, captchaMessageSuccess]);

  const insertShortcode = (code: string) => {
    const refs = { before: beforeRef, fail: failRef, success: successRef };
    const setters = { before: setBefore, fail: setFail, success: setSuccess };
    const values = { before, fail, success };

    const field = activeField || 'before';
    const ref = refs[field];
    const setter = setters[field];
    const value = values[field];

    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const newValue = value.substring(0, start) + code + value.substring(end);
      setter(newValue);
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.selectionStart = start + code.length;
          ref.current.selectionEnd = start + code.length;
          ref.current.focus();
        }
      });
    } else {
      setter(value + code);
    }
  };

  const handleSave = async () => {
    try {
      await updateCaptcha.mutateAsync({
        channelId,
        data: {
          captcha_message_before: before || null,
          captcha_message_fail: fail || null,
          captcha_message_success: success || null,
        },
      });
      showSuccess('Тексты капчи сохранены');
      onOpenChange(false);
    } catch {
      showError('Ошибка сохранения');
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" padding="sm" className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Настройка капчи</span>
          <ModalBase.Close />
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Текст перед капчей</label>
            <textarea
              ref={beforeRef}
              className={styles.textarea}
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              onFocus={() => setActiveField('before')}
              placeholder="Введите текст"
              maxLength={1024}
              rows={3}
            />
            <div className={styles.shortcodeChips}>
              {SHORTCODES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={styles.shortcodeChip}
                  onClick={() => {
                    setActiveField('before');
                    insertShortcode(s.code);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Текст, если капча не пройдена</label>
            <textarea
              ref={failRef}
              className={styles.textarea}
              value={fail}
              onChange={(e) => setFail(e.target.value)}
              onFocus={() => setActiveField('fail')}
              placeholder="Введите текст"
              maxLength={1024}
              rows={3}
            />
            <div className={styles.shortcodeChips}>
              {SHORTCODES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={styles.shortcodeChip}
                  onClick={() => {
                    setActiveField('fail');
                    insertShortcode(s.code);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Текст, если капча пройдена успешно</label>
            <textarea
              ref={successRef}
              className={styles.textarea}
              value={success}
              onChange={(e) => setSuccess(e.target.value)}
              onFocus={() => setActiveField('success')}
              placeholder="{user.first_name}, добро пожаловать в группу!"
              maxLength={1024}
              rows={3}
            />
            <div className={styles.shortcodeChips}>
              {SHORTCODES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={styles.shortcodeChip}
                  onClick={() => {
                    setActiveField('success');
                    insertShortcode(s.code);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            variant="outline"
            intent="gradient"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Отменить
          </Button>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            onClick={handleSave}
            loading={saving}
          >
            Сохранить
          </Button>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CaptchaSettingsModal;
