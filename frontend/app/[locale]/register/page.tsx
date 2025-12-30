'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './register.module.scss';
import { useRegister } from './store';
import Button from '@/components/button/button';
import Card from '@/components/card';
import { TelegramIcon, BotIcon } from '@/components/icons';

export default function RegisterPage() {
  const { locale } = useParams();
  const {
    state,
    widgetContainerRef,
    initTelegramWidget,
    openBotForLogin,
    toggleTelegramWidget,
  } = useRegister();

  useEffect(() => {
    initTelegramWidget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusMessage = () => {
    switch (state.status) {
      case 'loading':
        return 'Регистрация...';
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

        <Card title="Регистрация. Шаг 1 из 2">
          <div className={styles.header}>
            <p className={styles.subtitle}>
              Авторизуйтесь для управления<br/>Telegram-каналами
            </p>
          </div>

          <div className={styles.methodSection}>
            <span className={styles.methodLabel}>Выберите способ входа</span>
            
            <div className={styles.telegramButtons}>
              <div 
                ref={widgetContainerRef} 
                className={styles.widgetContainer}
                style={{ display: state.showTelegramWidget ? 'flex' : 'none' }}
              />
              
              {!state.showTelegramWidget && (
                <Button
                  text="Через Telegram"
                  icon={<TelegramIcon />}
                  showArrow={false}
                  onClick={toggleTelegramWidget}
                  fullWidth
                />
              )}
              
              <Button
                text="Telegram бот"
                icon={<BotIcon />}
                showArrow={false}
                onClick={openBotForLogin}
                fullWidth
              />
            </div>

            <div className={styles.actions}>
              <Button
                text="Продолжить"
                showArrow={false}
                onClick={() => {}}
                active
                fullWidth
              />
              
              <div className={styles.login}>
                <span>Уже есть аккаунт?</span>
                <Link href={`/${locale}/login`}>Войти</Link>
              </div>
            </div>
          </div>

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
