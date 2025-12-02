'use client';

import { useId } from 'react';
import styles from "./pricing.module.scss";
import Button from "@/components/button/button";

const plans = [
  {
    title: "Пробный",
    price: "0 ₽/сутки",
    features: [
      "Тестируйте все функции 24 часа",
    ],
    isHighlighted: false
  },
  {
    title: "Базовый",
    price: "890 ₽/месяц",
    features: [
      "Доступен полный функционал сервиса",
      "Подключение до 5 каналов / чатов",
      "Создание и управление 5 ботами",
      "Подключение до 3 RSS-лент / репостеров"
    ],
    isHighlighted: true
  },
  {
    title: "Профессиональный",
    price: "1590 ₽/месяц",
    features: [
      "Доступен полный функционал сервиса",
      "Подключение до 15 каналов / чатов",
      "Создание и управление 15 ботами",
      "Подключение до 7 RSS-лент / репостеров"
    ],
    isHighlighted: false
  }
];

export default function Pricing() {
  const gradientId768 = useId();
  const gradientId1440 = useId();

  return (
    <section className={styles.pricing}>
      <svg 
        className={styles.decorationLine768}
        width="768" 
        height="298" 
        viewBox="0 0 768 298" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0 1.7793C17.6262 48.0684 -10.7714 330.532 329.359 187.187C386.014 163.31 174.751 376.621 768 255.077" 
          stroke={`url(#${gradientId768})`} 
          strokeOpacity="0.1" 
          strokeWidth="10"
        />
        <defs>
          <linearGradient id={gradientId768} x1="-75.3438" y1="-524.826" x2="784.371" y2="-524.826" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6"/>
            <stop offset="0.5" stopColor="#2F67C3"/>
            <stop offset="0.75" stopColor="#295AAA"/>
            <stop offset="0.875" stopColor="#26539D"/>
            <stop offset="0.9375" stopColor="#244F96"/>
            <stop offset="1" stopColor="#234C90"/>
          </linearGradient>
        </defs>
      </svg>
      <svg 
        className={styles.decorationLine1440}
        width="1440" 
        height="592" 
        viewBox="0 0 1440 592" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M-21 3.55566C14 95.5557 -42.3886 656.955 633 372.056C745.499 324.6 326 748.556 1504 506.987" 
          stroke={`url(#${gradientId1440})`} 
          strokeOpacity="0.1" 
          strokeWidth="20"
        />
        <defs>
          <linearGradient id={gradientId1440} x1="-170.608" y1="-1043.08" x2="1536.51" y2="-1043.08" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6"/>
            <stop offset="0.5" stopColor="#2F67C3"/>
            <stop offset="0.75" stopColor="#295AAA"/>
            <stop offset="0.875" stopColor="#26539D"/>
            <stop offset="0.9375" stopColor="#244F96"/>
            <stop offset="1" stopColor="#234C90"/>
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headline}>Выберите свой план</h1>
          <h2 className={styles.subtitle}>
            <span className={styles.highlight}>Решение для любого масштаба проектов</span>
          </h2>
          <p className={styles.description}>
            От личного блога до крупного проекта — управляйте контентом эффективно и выгодно
          </p>
          <div className={styles.planeIcon}>
            <img src="/hero_4.svg" alt="Pricing illustration" />
          </div>
        </div>

        <div className={styles.cards}>
          <div className={styles.planeIcon_2}>
            <img src="/hero_4.svg" alt="Pricing illustration" />
          </div>
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`${styles.card} ${plan.isHighlighted ? styles.highlighted : ''}`}
            >
              <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{plan.title}</h3>
              <div className={styles.cardPrice}>
                {plan.price.split('/').map((part, i) => (
                  i === 0 ? (
                    <span key={i}>{part}</span>
                  ) : (
                    <span key={i} className={styles.pricePeriod}>/{part}</span>
                  )
                ))}
              </div>
              </div>
              <ul className={styles.features}>
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className={styles.feature}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.cardButton}>
                <Button text="Выбрать план" href="/login" fullWidth active={index === 1}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

