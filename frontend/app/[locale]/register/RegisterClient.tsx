'use client';

import Link from 'next/link';
import styles from './register.module.scss';
import { useRegister } from './store';
import Button from '@/components/button/button';
import Card from '@/components/card';
import Input from '@/components/input';
import { Checkbox } from '@/components/checkbox';
import { TelegramIcon, BotIcon } from '@/components/icons';
import { ErrorNotification } from '@/components/notifications/ErrorNotification';
import { SuccessNotification } from '@/components/notifications/SuccessNotification';

type Props = {
  locale: string;
};

export default function RegisterClient({ locale }: Props) {
  const {
    state,
    widgetContainerRef,
    openBotForLogin,
    setEmail,
    setPassword,
    setAgreePersonalData,
    setAgreeTerms,
    addEmailToAccount,
    setError,
  } = useRegister(locale);

  const getSuccessMessage = () => {
    const displayName =
      state.user?.telegram_account?.first_name ||
      state.user?.telegram_account?.username ||
      state.email ||
      'пользователь';
    return `Готово! Привет, ${displayName}. Переходим в сервис...`;
  };

  const renderStep1 = () => (
    <>
      <div className={styles.header}>
        <p className={styles.subtitle}>
          Авторизуйтесь для управления<br />Telegram-каналами
        </p>
      </div>

      <div className={styles.methodSection}>
        <span className={styles.methodLabel}>Выберите способ входа</span>

        <div className={styles.telegramButtons}>
          <div className={styles.telegramAuthWrapper}>
            <Button
              text="Через Telegram"
              icon={<TelegramIcon />}
              showArrow={false}
              onClick={() => {}}
              fullWidth
              active={true}
              className={styles.telegramButton}
            />
            <div ref={widgetContainerRef} className={styles.telegramWidgetOverlay} />
          </div>

          <Button
            text="Telegram бот"
            icon={<BotIcon />}
            showArrow={false}
            onClick={openBotForLogin}
            fullWidth
            active={true}
          />
        </div>

        <div className={styles.actions}>
          <div className={styles.login}>
            <span>Уже есть аккаунт?</span>
            <Link href={`/${locale}/login`}>Войти</Link>
          </div>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className={styles.header}>
        <p className={styles.subtitle}>
          Добавьте вход по почте — как запасной<br />способ доступа к аккаунту
        </p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formFields}>
          <Input
            label="Электронная почта"
            type="email"
            placeholder="username@example.com"
            value={state.email}
            onChange={setEmail}
          />

          <Input
            label="Пароль"
            type="password"
            placeholder="••••••••••••••"
            value={state.password}
            onChange={setPassword}
          />
        </div>

        <div className={styles.checkboxes}>
          <Checkbox
            checked={state.agreePersonalData}
            onChange={setAgreePersonalData}
            label={
              <>
                Соглашаюсь на обработку{' '}
                <Link href={`/${locale}/privacy`}>персональных данных</Link>
              </>
            }
          />

          <Checkbox
            checked={state.agreeTerms}
            onChange={setAgreeTerms}
            label={
              <>
                Принимаю <Link href={`/${locale}/terms`}>условия использования</Link>
              </>
            }
          />
        </div>

        <Button
          text="Завершить регистрацию"
          showArrow={false}
          onClick={addEmailToAccount}
          active
          fullWidth
          loading={state.loading}
        />
      </div>
    </>
  );

  return (
    <>
      {state.status === 'error' && state.error && (
        <ErrorNotification message={state.error} onClose={() => setError(null)} />
      )}
      {state.status === 'success' && (
        <SuccessNotification message={getSuccessMessage()} onClose={() => {}} />
      )}
      <main className={styles.main}>
        <div className={styles.container}>
          <Link href={`/${locale}`} className={styles.logo} aria-label="LAMAplanner">
            <span className={styles.logoLama}>LAMA</span>
            <span className={styles.logoPlanner}>planner</span>
          </Link>

          <Card title={`Регистрация. Шаг ${state.step} из 2`}>
            {state.step === 1 ? renderStep1() : renderStep2()}
          </Card>
        </div>
      </main>
    </>
  );
}
