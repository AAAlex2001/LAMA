'use client';

import { useState } from 'react';
import styles from './profile.module.scss';
import SimpleDropdown from '@/components/simple-dropdown/simple-dropdown';
import UsageLine from '@/components/usage-line/usage-line';
import Toggle from '@/components/toggle/toggle';
import Input from '@/components/input';
import Button from '@/components/button/button';
import { EditNameIcon, TrashIcon } from '@/components/icons';

export default function ProfilePage() {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('password');
  const [notifyInboxBot, setNotifyInboxBot] = useState(true);
  const [notifyTelegramBot, setNotifyTelegramBot] = useState(true);
  const [notifyInboxMessages, setNotifyInboxMessages] = useState(true);
  const [notifyTelegramMessages, setNotifyTelegramMessages] = useState(true);
  const [notifyInboxErrors, setNotifyInboxErrors] = useState(false);
  const [notifyTelegramErrors, setNotifyTelegramErrors] = useState(false);
  const [notifyInboxResults, setNotifyInboxResults] = useState(false);
  const [notifyTelegramResults, setNotifyTelegramResults] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.contentCard}>
        <div className={styles.content}>
          {/* Account */}
          <section className={styles.accountSection}>
            <div className={styles.accountRow}>
              <div className={styles.avatar} />
              <div className={styles.userInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.userName}>John Doe</span>
                  <button className={styles.editButton} aria-label="Редактировать имя">
                    <EditNameIcon />
                  </button>
                </div>
                <span className={styles.userHandle}>@JohnDoe</span>
              </div>
            </div>
            <span className={styles.accountNote}>Данные получены из Telegram</span>
          </section>

          {/* Grid */}
          <div className={styles.grid}>
            <div className={styles.leftColumn}>
              {/* Timezone */}
              <section className={`${styles.section} ${styles.timezoneSection}`}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Часовой пояс</h2>
                    <p className={styles.sectionDesc}>
                      Используется для отображения времени в календаре и планирования публикаций
                    </p>
                  </div>
                  <SimpleDropdown value="Москва (GMT +3)" className={styles.dropdown} />
                </div>
              </section>

              {/* Language */}
              <section className={`${styles.section} ${styles.languageSection}`}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Смена языка</h2>
                    <p className={styles.sectionDesc}>Выберите язык интерфейса для работы с сервисом</p>
                  </div>
                  <SimpleDropdown value="Русский" className={styles.dropdown} />
                </div>
              </section>

              {/* Tariff */}
              <section className={`${styles.section} ${styles.tariffSection}`}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Тарифный план</h2>
                    <p className={styles.sectionDesc}>Информация о вашем плане и доступе к сервису</p>
                  </div>
                  <Button text="Сменить план" size="default" fullWidth={true} showArrow={false} />
                </div>
                <div className={styles.planMeta}>
                  <span className={styles.planBadge}>Базовый</span>
                  <div className={styles.planActive}>
                    <span className={styles.planActiveLabel}>Активен</span>
                    <span className={styles.planActiveDate}>до 15 декабря 2025</span>
                  </div>
                </div>
                <div className={styles.planLimits}>
                  <span className={styles.planLimitsTitle}>Доступные лимиты</span>
                  <div className={styles.usageList}>
                    <UsageLine label="Каналы/чаты" current={3} total={5} />
                    <UsageLine label="Боты" current={3} total={5} />
                    <UsageLine label="RSS-ленты/репостеры" current={3} total={3} />
                  </div>
                  <span className={styles.planHint}>Обновите план, чтобы подключить больше</span>
                </div>
              </section>
            </div>

            <div className={styles.rightColumn}>
              {/* Notifications */}
              <section className={`${styles.section} ${styles.notificationsSection}`}>
                <div className={styles.sectionHeaderText}>
                  <h2 className={styles.sectionTitle}>Уведомления</h2>
                  <p className={styles.sectionDesc}>Выберите, какие уведомления вы хотите получать и где именно</p>
                </div>
                <div className={styles.notificationHeader}>
                  <span />
                  <div className={styles.notificationColumns}>
                    <span>Inbox</span>
                    <span className={styles.desktopOnly}>Telegram</span>
                    <span className={styles.mobileOnly}>Tg</span>
                  </div>
                </div>
                <div className={styles.notificationsList}>
                  <div className={styles.notificationRow}>
                    <div className={styles.notificationInfo}>
                      <span className={styles.notificationTitle}>Подключение Telegram-бота</span>
                      <span className={styles.notificationHint}>Напоминания, если бот не подключён</span>
                    </div>
                    <div className={styles.notificationToggles}>
                      <Toggle checked={notifyInboxBot} onChange={setNotifyInboxBot} />
                      <Toggle checked={notifyTelegramBot} onChange={setNotifyTelegramBot} />
                    </div>
                  </div>
                  <div className={styles.notificationRow}>
                    <div className={styles.notificationInfo}>
                      <span className={styles.notificationTitle}>Новые сообщения</span>
                      <span className={styles.notificationHint}>Оповещения о входящих сообщениях</span>
                    </div>
                    <div className={styles.notificationToggles}>
                      <Toggle checked={notifyInboxMessages} onChange={setNotifyInboxMessages} />
                      <Toggle checked={notifyTelegramMessages} onChange={setNotifyTelegramMessages} />
                    </div>
                  </div>
                  <div className={styles.notificationRow}>
                    <div className={styles.notificationInfo}>
                      <span className={styles.notificationTitle}>Ошибки и сбои</span>
                      <span className={styles.notificationHint}>Уведомления о проблемах с публикациями</span>
                    </div>
                    <div className={styles.notificationToggles}>
                      <Toggle checked={notifyInboxErrors} onChange={setNotifyInboxErrors} />
                      <Toggle checked={notifyTelegramErrors} onChange={setNotifyTelegramErrors} />
                    </div>
                  </div>
                  <div className={styles.notificationRow}>
                    <div className={styles.notificationInfo}>
                      <span className={styles.notificationTitle}>О результатах публикаций</span>
                      <span className={styles.notificationHint}>Уведомления о статусе и результатах постов</span>
                    </div>
                    <div className={styles.notificationToggles}>
                      <Toggle checked={notifyInboxResults} onChange={setNotifyInboxResults} />
                      <Toggle checked={notifyTelegramResults} onChange={setNotifyTelegramResults} />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Security */}
          <section className={styles.section}>
            <div className={styles.sectionHeaderText}>
              <h2 className={styles.sectionTitle}>Безопасность аккаунта</h2>
              <p className={styles.sectionDesc}>Управление данными для входа в аккаунт</p>
            </div>
            <div className={styles.securityInputs}>
              <Input
                label="Электронная почта"
                value={email}
                onChange={setEmail}
                placeholder="username@example.com"
                variant="white"
                className={styles.inputWhite}
                icons={[{ icon: <EditNameIcon />, className: styles.inputIcon }]}
              />
              <Input
                label="Пароль"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="*******************"
                variant="white"
                className={styles.inputWhite}
                icons={[{ icon: <EditNameIcon />, className: styles.inputIcon }]}
              />
            </div>
          </section>

          {/* Delete */}
          <section className={styles.deleteSection}>
            <p className={styles.supportText}>Нашли ошибку? Сообщите нам в @LamaPlannerBot</p>
            <div className={styles.deleteActions}>
              <button className={styles.deleteIconButton} aria-label="Удалить аккаунт">
                <TrashIcon />
              </button>
              <Button text="Выйти из аккаунта" className={styles.logoutButton} showArrow={false} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
