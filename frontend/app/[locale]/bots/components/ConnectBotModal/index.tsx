'use client';

import { FC, useState, FormEvent } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input';
import { Button } from '@/components/new-button';
import { ChevronDownIcon } from '@/components/icons';
import s from './styles.module.scss';

interface ConnectBotModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (token: string) => Promise<void>;
}

const STEPS = [
  'Откройте Telegram и найдите @BotFather',
  'Нажмите /start',
  'Используйте команду /newbot',
  'Укажите имя и username бота',
  'Скопируйте выданный API-токен',
  'Вставьте его в поле выше',
];

const ConnectBotModal: FC<ConnectBotModalProps> = ({ isOpen, onOpenChange, onSubmit }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Введите токен бота');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(token.trim());
      setToken('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setToken('');
      setError(null);
      setInstructionsOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={handleClose}>
      <ModalBase.Content size="md">
        <div className={s.headerBlock}>
          <span className={s.title}>Подключение Telegram-бота</span>
          <span className={s.subtitle}>Вставьте API-токен, полученный в @BotFather</span>
        </div>

        {!instructionsOpen ? (
          <button
            type="button"
            className={s.dropdownToggle}
            onClick={() => setInstructionsOpen(true)}
          >
            <span className={s.dropdownText}>Как получить токен?</span>
            <ChevronDownIcon
              width={16}
              height={16}
              color="#000000"
              className={s.dropdownChevron}
            />
          </button>
        ) : (
          <div className={s.dropdownBody}>
            <button
              type="button"
              className={s.dropdownHeader}
              onClick={() => setInstructionsOpen(false)}
            >
              <span className={s.dropdownText}>Как получить токен?</span>
              <ChevronDownIcon
                width={16}
                height={16}
                color="#000000"
                className={`${s.dropdownChevron} ${s.dropdownChevronOpen}`}
              />
            </button>
            <div className={s.steps}>
              {STEPS.map((text, i) => (
                <div key={i} className={s.step}>
                  <span className={s.stepDot} />
                  <span className={s.stepText}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={s.form}>
          <Input
            label="API-токен"
            placeholder="123456789:AAExampleTokenFromBotFather"
            value={token}
            onChange={setToken}
            error={error}
            disabled={loading}
            autoFocus
          />
          <span className={s.warning}>
            Не передавайте токен третьим лицам. Он даёт полный доступ к управлению ботом.
          </span>
          <ModalBase.Footer>
            <Button
              type="submit"
              variant="fill"
              intent="gradient"
              loading={loading}
              disabled={loading || !token.trim()}
            >
              Подключить
            </Button>
          </ModalBase.Footer>
        </form>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ConnectBotModal;
