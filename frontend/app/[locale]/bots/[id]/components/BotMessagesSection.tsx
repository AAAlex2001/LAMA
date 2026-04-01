'use client';

import { FC } from 'react';
import s from './BotMessagesSection.module.scss';

const BotMessagesSection: FC = () => (
  <div className={s.section}>
    <span className={s.title}>Сообщения и триггеры</span>
    <span className={s.subtitle}>
      Здесь будут настройки автоматических сообщений, триггеров и ответов бота.
    </span>
  </div>
);

export default BotMessagesSection;
