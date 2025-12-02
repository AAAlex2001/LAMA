'use client';

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
  return (
    <section className={styles.pricing}>
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
            <img src="/hero_4.svg" alt="Hero illustration" />
          </div>
            <div className={styles.planeIcon_2}>
            <img src="/hero_4.svg" alt="Hero illustration" />
          </div>
        </div>

        <div className={styles.cards}>
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
                <Button text="Выбрать план" href="/login" fullWidth={true}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

