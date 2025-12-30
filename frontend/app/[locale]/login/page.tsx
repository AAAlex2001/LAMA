'use client';

import { useEffect } from 'react';
import styles from './login.module.scss';
import { useLogin } from './store';
import Input from '@/components/input';
import Button from '@/components/button/button';
import Card from '@/components/card';
import { TelegramIcon, BotIcon } from '@/components/icons';
import { ErrorNotification } from '@/components/notifications/ErrorNotification';
import { SuccessNotification } from '@/components/notifications/SuccessNotification';

export default function LoginPage() {
  const {
    state,
    widgetContainerRef,
    initTelegramWidget,
    openBotForLogin,
    loginWithEmail,
    setEmail,
    setPassword,
    clearNotifications,
  } = useLogin();

  useEffect(() => {
    initTelegramWidget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSuccessMessage = () => {
    const displayName = state.user?.telegram_account?.first_name 
      || state.user?.telegram_account?.username 
      || state.user?.email
      || 'пользователь';
    return `Готово! Привет, ${displayName}. Переходим в сервис...`;
  };

  return (
    <>
      {state.status === 'error' && state.error && (
        <ErrorNotification
          message={state.error}
          onClose={clearNotifications}
        />
      )}
      {state.status === 'success' && (
        <SuccessNotification
          message={getSuccessMessage()}
          onClose={clearNotifications}
        />
      )}
      <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoLama}>LAMA</span>
          <span className={styles.logoPlanner}>planner</span>
        </div>

        <Card title="Вход в аккаунт">
          <div className={styles.telegramButtons}>
            <div className={styles.telegramAuthWrapper}>
              <Button
                text="Через Telegram"
                icon={<TelegramIcon />}
                showArrow={false}
                onClick={() => {}}
                active
                fullWidth
                className={styles.telegramButton}
              />
              <div
                ref={widgetContainerRef}
                className={styles.telegramWidgetOverlay}
              />
            </div>
            
            <Button
              text="Telegram бот"
              icon={<BotIcon />}
              showArrow={false}
              onClick={openBotForLogin}
              active
              fullWidth
            />
          </div>

          <div className={styles.dividerSection}>
            <span className={styles.divider}>или</span>
            
            <div className={styles.formSection}>
              <div className={styles.formFields}>
                <Input
                  label="Электронная почта"
                  type="email"
                  placeholder="username@example.com"
                  value={state.form.email}
                  onChange={setEmail}
                  error={state.fieldErrors.email}
                />
                
                <div className={styles.passwordField}>
                  <Input
                    label="Пароль"
                    type="password"
                    placeholder="••••••••••••••"
                    value={state.form.password}
                    onChange={setPassword}
                    error={state.fieldErrors.password}
                  />
                  <div className={styles.forgotPassword}>
                    <a href="/forgot-password">Забыли пароль?</a>
                  </div>
                </div>
              </div>

              <div className={styles.actions}>
                <Button
                  text="Войти"
                  showArrow={false}
                  onClick={loginWithEmail}
                  loading={state.loading}
                  fullWidth
                />
                
                <div className={styles.register}>
                  <span>Нет аккаунта? </span>
                  <a href="/register">Зарегистрироваться</a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
    </>
  );
}
