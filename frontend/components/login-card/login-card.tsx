'use client';

import { useEffect } from 'react';
import styles from './login-card.module.scss';
import { useLogin } from './store/useLogin';
import Input from '@/components/input';
import Button from '@/components/button/button';
import { TelegramIcon, BotIcon } from '@/components/icons';

interface LoginCardProps {
  locale?: string;
  texts?: {
    title?: string;
    telegramButton?: string;
    botButton?: string;
    divider?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    passwordLabel?: string;
    passwordPlaceholder?: string;
    forgotPassword?: string;
    loginButton?: string;
    noAccount?: string;
    register?: string;
  };
}

const defaultTexts = {
  title: 'Вход в аккаунт',
  telegramButton: 'Через Telegram',
  botButton: 'Telegram бот',
  divider: 'или',
  emailLabel: 'Электронная почта',
  emailPlaceholder: 'username@example.com',
  passwordLabel: 'Пароль',
  passwordPlaceholder: '••••••••••••••',
  forgotPassword: 'Забыли пароль?',
  loginButton: 'Войти',
  noAccount: 'Нет аккаунта?',
  register: 'Зарегистрироваться',
};

export default function LoginCard({ locale = 'ru', texts = {} }: LoginCardProps) {
  const t = { ...defaultTexts, ...texts };
  
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
    <div className={styles.card}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t.title}</h1>

        <div className={styles.telegramButtons}>
          <Button
            text={t.telegramButton}
            icon={<TelegramIcon />}
            showArrow={false}
            onClick={() => {}}
            active
            fullWidth
          />
          
          <Button
            text={t.botButton}
            icon={<BotIcon />}
            showArrow={false}
            onClick={openBotForLogin}
            active
            fullWidth
          />
        </div>

        <div className={styles.dividerSection}>
          <span className={styles.divider}>{t.divider}</span>
          
          <div className={styles.formSection}>
            <div className={styles.formFields}>
              <Input
                label={t.emailLabel}
                type="email"
                placeholder={t.emailPlaceholder}
                value={state.form.email}
                onChange={setEmail}
                error={state.fieldErrors.email}
              />
              
              <div className={styles.passwordField}>
                <Input
                  label={t.passwordLabel}
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={state.form.password}
                  onChange={setPassword}
                  error={state.fieldErrors.password}
                />
                <div className={styles.forgotPassword}>
                  <a href={`/${locale}/forgot-password`}>{t.forgotPassword}</a>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                text={t.loginButton}
                showArrow={false}
                fullWidth
                className={styles.loginButton}
              />
              
              <div className={styles.register}>
                <span>{t.noAccount} </span>
                <a href={`/${locale}/register`}>{t.register}</a>
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
      </div>
    </div>
  );
}
