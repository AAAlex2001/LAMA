'use client';

import { useEffect } from 'react';
import styles from './login.module.scss';
import { useLogin } from './store';
import Input from '@/components/input';
import Button from '@/components/button/button';
import Card from '@/components/card';
import { TelegramIcon, BotIcon } from '@/components/icons';

export default function LoginPage() {
  const {
    state,
    widgetContainerRef,
    initTelegramWidget,
    openBotForLogin,
    setEmail,
    setPassword,
  } = useLogin();

  useEffect(() => {
    initTelegramWidget();
  }, [initTelegramWidget]);

  const getStatusMessage = () => {
    switch (state.status) {
      case 'loading':
        return 'Авторизация...';
      case 'success':
        const displayName = state.user?.telegram_account?.first_name 
          || state.user?.telegram_account?.username 
          || 'пользователь';
        return `Готово! Привет, ${displayName}. Переходим в сервис...`;
      case 'error':
        return state.error || 'Произошла ошибка';
      default:
        return null;
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoLama}>LAMA</span>
          <span className={styles.logoPlanner}>planner</span>
        </div>

        <Card title="Вход в аккаунт">
          <div className={styles.telegramButtons}>
            <Button
              text="Через Telegram"
              icon={<TelegramIcon />}
              showArrow={false}
              onClick={() => {}}
              active
              fullWidth
            />
            
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
                  fullWidth
                />
                
                <div className={styles.register}>
                  <span>Нет аккаунта? </span>
                  <a href="/register">Зарегистрироваться</a>
                </div>
              </div>
            </div>
          </div>

          <div ref={widgetContainerRef} className={styles.widgetContainer} />

          {getStatusMessage() && (
            <div className={`${styles.statusMessage} ${styles[state.status]}`}>
              {getStatusMessage()}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
