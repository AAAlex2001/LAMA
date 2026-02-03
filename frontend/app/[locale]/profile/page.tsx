'use client';

import { useMemo, useState } from 'react';
import styles from './profile.module.scss';
import SimpleDropdown from '@/components/simple-dropdown/simple-dropdown';
import UsageLine from '@/components/usage-line/usage-line';
import Toggle from '@/components/toggle/toggle';
import Input from '@/components/input';
import Modal from '@/components/modal';
import Button from '@/components/button/button';
import { EditNameIcon, TrashIcon, FlagRuIcon, FlagGbIcon, FlagRsIcon } from '@/components/icons';
import { getTimeZones } from '@vvo/tzdb';
const formatOffset = (minutes: number) => {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `GMT ${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`;
};

const formatTzLabel = (tz: { name: string; currentTimeOffsetInMinutes: number; mainCities?: string[] }) => {
  const city = tz.mainCities?.[0] || tz.name.split('/').slice(-1)[0].replace(/_/g, ' ');
  return `${city} (${formatOffset(tz.currentTimeOffsetInMinutes)})`;
};

export default function ProfilePage() {
  const userName = 'John Doe';
  const avatarLetter = userName.trim().charAt(0).toUpperCase();
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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const timezones = useMemo(() => getTimeZones(), []);
  const timezoneItems = useMemo(
    () =>
      timezones.map((tz) => ({
        value: tz.name,
        label: formatTzLabel(tz),
      })),
    [timezones]
  );
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const selectedTimezoneLabel =
    timezoneItems.find((item) => item.value === timezone)?.label || 'Москва (GMT +3)';
  const [language, setLanguage] = useState('Русский');

  return (
    <div className={styles.page}>
      <div className={styles.contentCard}>
        <div className={styles.content}>
          <section className={styles.accountSection}>
            <div className={styles.accountRow}>
              <div className={styles.avatar}>{avatarLetter}</div>
              <div className={styles.userInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.userName}>{userName}</span>
                </div>
                <span className={styles.userHandle}>@JohnDoe</span>
              </div>
            </div>
            <span className={styles.accountNote}>Данные получены из Telegram</span>
          </section>

          <div className={styles.grid}>
            <div className={styles.leftColumn}>
              <section className={`${styles.section} ${styles.timezoneSection}`}>
                <div className={`${styles.sectionHeaderRow} ${styles.horizontalLayout}`}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Часовой пояс</h2>
                    <p className={styles.sectionDesc}>
                      Используется для отображения времени в календаре и планирования публикаций
                    </p>
                  </div>
                  <SimpleDropdown
                    value={selectedTimezoneLabel}
                    className={styles.dropdown}
                    items={timezoneItems}
                    onSelect={setTimezone}
                    searchable
                    searchPlaceholder="Поиск города"
                  />
                </div>
              </section>
              <section className={`${styles.section} ${styles.tariffSection}`}>
                <div className={`${styles.sectionHeaderRow} ${styles.tariffHeaderRow}`}>
                  <div className={`${styles.sectionHeaderText} ${styles.tariffHeaderText}`}>
                    <h2 className={styles.sectionTitle}>Тарифный план</h2>
                    <p className={styles.sectionDesc}>Информация о вашем плане и доступе к сервису</p>
                  </div>
                  <Button text="Сменить план" className={styles.tariffButton} size="default" showArrow={false} />
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
              <section className={`${styles.section} ${styles.languageSection}`}>
                <div className={`${styles.sectionHeaderRow} ${styles.horizontalLayout}`}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Смена языка</h2>
                    <p className={styles.sectionDesc}>Выберите язык интерфейса для работы с сервисом</p>
                  </div>
                  <SimpleDropdown
                    value={language}
                    className={styles.dropdown}
                    items={[
                      {
                        value: 'Русский',
                        label: 'Русский',
                        icon: <FlagRuIcon />,
                      },
                      {
                        value: 'English',
                        label: 'English',
                        icon: <FlagGbIcon />,
                      },
                      {
                        value: 'Serbian',
                        label: 'Serbian',
                        icon: <FlagRsIcon />,
                      },
                    ]}
                    onSelect={setLanguage}
                  />
                </div>
              </section>

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

          <section className={`${styles.section} ${styles.securitySection}`}>
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
                disabled
                icons={[
                  {
                    icon: <EditNameIcon />,
                    className: styles.inputIcon,
                    onClick: () => setIsEmailModalOpen(true),
                  },
                ]}
              />
              <Input
                label="Пароль"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="*******************"
                variant="white"
                className={styles.inputWhite}
                disabled
                icons={[
                  {
                    icon: <EditNameIcon />,
                    className: styles.inputIcon,
                    onClick: () => setIsPasswordModalOpen(true),
                  },
                ]}
              />
            </div>
          </section>

          <section className={styles.deleteSection}>
            <p className={styles.supportText}>Нашли ошибку? Сообщите нам в @LamaPlannerBot</p>
            <div className={styles.deleteActions}>
              <button
                className={styles.deleteIconButton}
                aria-label="Удалить аккаунт"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <TrashIcon width={15} height={16.67} />
                <span className={styles.deleteText}>Удалить аккаунт</span>
              </button>
              <button className={styles.logoutButton} onClick={() => setIsLogoutModalOpen(true)}>
                Выйти из аккаунта
              </button>
            </div>
          </section>
          <Modal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={() => setIsLogoutModalOpen(false)}
            title="Выйти из аккаунта?"
            description="Вы сможете войти снова в любой момент"
            confirmText="Выйти"
            cancelText="Отменить"
            confirmVariant="default"
            confirmActive
            cancelActive={false}
          />
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => setIsDeleteModalOpen(false)}
            title="Удалить аккаунт?"
            description="Вы собираетесь навсегда удалить аккаунт LamaPlanner. Это действие необратимо"
            confirmText="Удалить все данные"
            cancelText="Отменить"
            confirmVariant="outlined-red"
            confirmActive={false}
            cancelActive
            confirmFirst
          />
          <Modal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            onConfirm={() => setNewEmail('')}
            title="Смена электронной почты"
            description="Мы отправим письмо для подтверждения нового адреса"
            confirmText="Подтвердить"
            cancelText="Отменить"
            confirmVariant="default"
            confirmActive
            cancelActive={false}
            buttonsDirection="row"
          >
            <Input
              label="Новая электронная почта"
              value={newEmail}
              onChange={setNewEmail}
              placeholder="Введите новый email"
            />
          </Modal>
          <Modal
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            onConfirm={() => {
              setNewPassword('');
              setConfirmPassword('');
            }}
            title="Смена пароля"
            description="Мы отправим письмо для подтверждения смены пароля"
            confirmText="Подтвердить"
            cancelText="Отменить"
            confirmVariant="default"
            confirmActive
            cancelActive={false}
            buttonsDirection="row"
          >
            <div className={styles.modalFields}>
              <Input
                label="Новый пароль"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Введите новый пароль"
              />
              <Input
                label="Подтверждение пароля"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Повторите новый пароль"
              />
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
