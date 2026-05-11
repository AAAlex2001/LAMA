'use client';

import { useMemo, useState } from 'react';
import styles from './profile.module.scss';
import { AppLayout } from '@/components/app-layout';
import SimpleDropdown from '@/components/simple-dropdown/simple-dropdown';
import UsageLine from '@/components/usage-line/usage-line';
import Input from '@/components/input';
import { Button } from '@/components/new-button';
import { EditNameIcon, TrashIcon, FlagRuIcon, FlagGbIcon, FlagRsIcon } from '@/components/icons';
import { getTimeZones } from '@vvo/tzdb';
import NotificationsSection from './components/NotificationsSection';
import ProfileModals from './components/ProfileModals';

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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

  const timezones = useMemo(() => getTimeZones(), []);
  const timezoneItems = useMemo(
    () => timezones.map((tz) => ({ value: tz.name, label: formatTzLabel(tz) })),
    [timezones],
  );
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const selectedTimezoneLabel =
    timezoneItems.find((item) => item.value === timezone)?.label || 'Москва (GMT +3)';
  const [language, setLanguage] = useState('Русский');

  return (
    <AppLayout pageTitle="Профиль">
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
                    <Button className={styles.tariffButton}>Сменить план</Button>
                  </div>
                  <div className={styles.planMeta}>
                    <span className={styles.planBadge}>Базовый</span>
                    <div className={styles.planActive}>
                      <span className={styles.planActiveLabel}>Активен</span>
                      <span className={styles.planActiveDate}>до 15 декабря 2025</span>
                    </div>
                  </div>
                  <div className={styles.planLimits} onClick={() => setIsLimitsModalOpen(true)} style={{ cursor: 'pointer' }}>
                    <span className={styles.planLimitsTitle}>Доступные лимиты</span>
                    <div className={styles.usageList}>
                      <UsageLine label="Каналы/чаты" current={3} total={5} />
                      <UsageLine label="Боты" current={3} total={5} />
                      <UsageLine label="RSS-ленты/репостеры" current={3} total={3} />
                    </div>
                    <span className={styles.planHint}>Обновите план, чтобы подключить больше</span>
                  </div>
                </section>

                <section className={`${styles.section} ${styles.securitySection}`}>
                  <div className={styles.sectionHeaderText}>
                    <h2 className={styles.sectionTitle}>Безопасность аккаунта</h2>
                    <p className={styles.sectionDesc}>Управление данными для входа в аккаунт</p>
                  </div>
                  <div className={styles.securityInputs}>
                    <div className={styles.inputClickable} onClick={() => setIsEmailModalOpen(true)}>
                      <Input
                        label="Электронная почта"
                        value={email}
                        onChange={setEmail}
                        placeholder="username@example.com"
                        variant="white"
                        className={styles.inputWhite}
                        disabled
                        icons={[{ icon: <EditNameIcon />, className: styles.inputIcon }]}
                      />
                    </div>
                    <div className={styles.inputClickable} onClick={() => setIsPasswordModalOpen(true)}>
                      <Input
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="*******************"
                        variant="white"
                        className={styles.inputWhite}
                        disabled
                        icons={[{ icon: <EditNameIcon />, className: styles.inputIcon }]}
                      />
                    </div>
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
                        { value: 'Русский', label: 'Русский', icon: <FlagRuIcon /> },
                        { value: 'English', label: 'English', icon: <FlagGbIcon /> },
                        { value: 'Serbian', label: 'Serbian', icon: <FlagRsIcon /> },
                      ]}
                      onSelect={setLanguage}
                    />
                  </div>
                </section>

                <NotificationsSection />
              </div>
            </div>

            <section className={styles.deleteSection}>
              <p className={styles.supportText}>Нашли ошибку? Сообщите нам в @LamaPlannerBot</p>
              <div className={styles.deleteActions}>
                <button
                  className={`${styles.deleteIconButton} ${isDeleteModalOpen ? styles.active : ''}`}
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

            <ProfileModals
              isLimitsOpen={isLimitsModalOpen}
              onLimitsClose={() => setIsLimitsModalOpen(false)}
              isLogoutOpen={isLogoutModalOpen}
              onLogoutClose={() => setIsLogoutModalOpen(false)}
              isDeleteOpen={isDeleteModalOpen}
              onDeleteClose={() => setIsDeleteModalOpen(false)}
              isEmailOpen={isEmailModalOpen}
              onEmailClose={() => setIsEmailModalOpen(false)}
              isPasswordOpen={isPasswordModalOpen}
              onPasswordClose={() => setIsPasswordModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
