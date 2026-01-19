'use client';

import Button from '@/components/button/button';
import { TelegramIcon } from '@/components/icons';
import styles from './maintenance.module.scss';

interface MaintenanceClientProps {
  locale: string;
}

export default function MaintenanceClient({ locale }: MaintenanceClientProps) {
  const content = {
    ru: {
      title: 'Вы попали сюда до официального запуска — приносим извинения, что пока не можем вас впустить. Сейчас сервис находится на стадии тестирования: мы хотим, чтобы ваш первый опыт был качественным, поэтому завершаем финальные доработки и откроем доступ в ближайшее время',
      buttonText: 'Telegram-канал LAMAplanner',
      footer: 'Официальную дату запуска объявим в канале. Спасибо, что вы с нами — скоро увидимся!',
    },
    en: {
      title: 'You arrived here before the official launch — we apologize that we cannot let you in yet. The service is currently in testing phase: we want your first experience to be high quality, so we are completing final improvements and will open access soon',
      buttonText: 'Telegram channel LAMAplanner',
      footer: 'We will announce the official launch date in the channel. Thank you for being with us — see you soon!',
    },
    sr: {
      title: 'Došli ste ovde pre zvaničnog lansiranja — izvinjavamo se što vas još uvek ne možemo pustiti. Servis je trenutno u fazi testiranja: želimo da vaše prvo iskustvo bude kvalitetno, pa završavamo finalne izmene i uskoro ćemo otvoriti pristup',
      buttonText: 'Telegram kanal LAMAplanner',
      footer: 'Zvaničan datum lansiranja ćemo objaviti u kanalu. Hvala što ste sa nama — vidimo se uskoro!',
    },
  };

  const text = content[locale as keyof typeof content] || content.ru;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <h1 className={styles.logo}>
            <span className={styles.lama}>LAMA</span>planner
          </h1>
        </div>
        
        <p className={styles.description}>{text.title}</p>
        
        <div className={styles.buttonContainer}>
          <Button 
            text={text.buttonText}
            icon={<TelegramIcon />}
            href="https://t.me/lamaplanner"
            showArrow={false}
            fullWidth={true}
          />
        </div>
        
        <p className={styles.footer}>{text.footer}</p>
      </div>
    </div>
  );
}
