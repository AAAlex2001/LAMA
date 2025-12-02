'use client';

import { useRef } from 'react';
import { useId } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import styles from "./advantages.module.scss";
import Button from "@/components/button/button";

export default function Advantages() {
  const swiperRef = useRef<SwiperType | null>(null);
  const gradientId = useId();

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
      title: "cta",
      description: "Сомнения позади: вы на пути к верному решению!",
      isCta: true
    },
    {
      title: "Дополнительная функция 1",
      description: "Описание дополнительной функции 1"
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
        <svg 
          className={styles.decorationSvg}
          width="154" 
          height="381" 
          viewBox="0 0 154 381" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M36.3548 232.943C158.518 295.943 160.518 175.943 117.855 157.443C86.3551 140.943 20.8545 152.943 36.3548 232.943ZM36.3548 232.943C-35.9831 168.443 55.5215 65.9431 131.355 7.94312M36.3548 232.943C39.1882 276.11 75.7176 350.643 138.518 371.443" 
            stroke={`url(#${gradientId})`}
            strokeOpacity="0.1"
            strokeWidth="20"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientId} x1="-4.48242" y1="198.193" x2="140.938" y2="198.193" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
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
            <span className={styles.cardLink}>Узнать подробнее</span>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Рекламный кабинет</h3>
            <p className={styles.cardDescription}>
              Создавайте рекламные посты, генерируйте ссылки-приглашения, заполняйте таблицы проданных и свободных мест, ведите отчёт о доходах и расходах и анализируйте прирост подписчиков после каждой рекламной кампании.
            </p>
            <span className={styles.cardLink}>Узнать подробнее</span>
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
                1440: {
                  slidesPerView: 3,
                },
              }}
              className={styles.swiper}
            >
              {swiperCards.map((card, index) => (
                <SwiperSlide key={index}>
                  {card.isCta ? (
                    <div className={styles.ctaCard}>
                      <p className={styles.ctaCardText}>{card.description}</p>
                      <div className={styles.ctaButton}>
                        <Button text="Начать бесплатно" href="/login" fullWidth />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.card}>
                      <h3 className={styles.cardTitle}>{card.title}</h3>
                      <p className={styles.cardDescription}>{card.description}</p>
                      <span className={styles.cardLink}>Узнать подробнее</span>
                    </div>
                  )}
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

