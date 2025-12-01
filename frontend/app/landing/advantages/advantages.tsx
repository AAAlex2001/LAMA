'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import styles from "./advantages.module.scss";

export default function Advantages() {
  const swiperRef = useRef<SwiperType | null>(null);

  const swiperCards = [
    {
      title: "Создавайте ботов",
      description: "Подключай ботов по токену @BotFather и управляй ими. Приветственные боты и боты обратной связи легко и быстро настраиваются"
    },
    {
      title: "Дополнительная функция 1",
      description: "Описание дополнительной функции 1"
    },
    {
      title: "Дополнительная функция 2",
      description: "Описание дополнительной функции 2"
    }
  ];

  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <h2 className={styles.headline}>
          Всё для <span className={styles.highlight}>продуктивной</span>{" "}
          <span className={styles.highlight}>и</span>{" "}
          <span className={styles.highlight}>лёгкой</span> работы с контентом
        </h2>
        <p className={styles.subtitle}>
          Профессиональный инструмент для тех, кто ценит порядок и эффективность
        </p>

        <div className={styles.cards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Постинг и планирование</h3>
            <p className={styles.cardDescription}>
              Создавайте публикации: текст, медиа, кнопки, опросы и AI-редактор — всё в одном окне. Планируйте серии, создавайте отложенные публикации, включайте автопостинг, автоудаление и мультипостинг в несколько каналов одновременно.
            </p>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Рекламный кабинет</h3>
            <p className={styles.cardDescription}>
              Создавайте рекламные посты, генерируйте ссылки-приглашения, заполняйте таблицы проданных и свободных мест, ведите отчёт о доходах и расходах и анализируйте прирост подписчиков после каждой рекламной кампании.
            </p>
          </div>

          <div className={styles.swiperContainer}>
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              spaceBetween={20}
              slidesPerView={1}
              loop={true}
              breakpoints={{
                768: {
                  slidesPerView: 2,
                },
              }}
              className={styles.swiper}
            >
              {swiperCards.map((card, index) => (
                <SwiperSlide key={index}>
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                    <p className={styles.cardDescription}>{card.description}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        <div className={styles.navigation}>
          <button 
            className={styles.navButton} 
            aria-label="Предыдущий"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
              <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="url(#paint0_linear_left)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear_left" x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="0.5" stopColor="#2F67C3"/>
                  <stop offset="0.75" stopColor="#295AAA"/>
                  <stop offset="0.875" stopColor="#26539D"/>
                  <stop offset="0.9375" stopColor="#244F96"/>
                  <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
          <button 
            className={styles.navButton} 
            aria-label="Следующий"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="url(#paint0_linear_right)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear_right" x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="0.5" stopColor="#2F67C3"/>
                  <stop offset="0.75" stopColor="#295AAA"/>
                  <stop offset="0.875" stopColor="#26539D"/>
                  <stop offset="0.9375" stopColor="#244F96"/>
                  <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

