'use client';

import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import styles from "./advantages.module.scss";
import Button from "@/components/button/button";

type Props = {
  locale: string;
  content: AdvantagesContent;
};

interface AdvantagesCard {
  title: string;
  description: string;
  isCta: boolean;
  linkText?: string | null;
  linkUrl?: string | null;
}

interface AdvantagesContent {
  headline: string;
  subtitle: string;
  cards: AdvantagesCard[];
}

export default function Advantages({ locale, content }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);

  const safe = useMemo(() => {
    return {
      headline: content?.headline || '',
      subtitle: content?.subtitle || '',
      cards: Array.isArray(content?.cards) ? content.cards : [],
    };
  }, [content]);

  const renderText = (text: string) => {
    // Парсим текст: ```курсив```, ``жирный``, `градиент`
    const parts = text.split(/(```.*?```|``.*?``|`.*?`)/);
    
    return parts.map((part, index) => {
      // Проверяем на ```курсив```
      if (part.startsWith('```') && part.endsWith('```')) {
        const content = part.slice(3, -3);
        return <span key={index} className={styles.italic}>{content}</span>;
      }
      
      // Проверяем на ``жирный``
      if (part.startsWith('``') && part.endsWith('``')) {
        const content = part.slice(2, -2);
        return <span key={index} className={styles.bold}>{content}</span>;
      }
      
      // Проверяем на `градиент`
      if (part.startsWith('`') && part.endsWith('`')) {
        const content = part.slice(1, -1);
        return <span key={index} className={styles.highlight}>{content}</span>;
      }
      
      // Обычный текст
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className={styles.headline}>
            {renderText(safe.headline)}
          </h2>
          <p className={styles.subtitle}>
            {renderText(safe.subtitle)}
          </p>

          <div className={styles.cards}>
            {/* Первые 2 статичные карточки */}
            {safe.cards.slice(0, 2).map((card, index) => (
              card.isCta ? (
                <div key={index} className={styles.card}>
                  <div className={styles.ctaCard}>
                    <p className={styles.ctaCardText}>{renderText(card.description)}</p>
                    <div className={styles.ctaButton}>
                      <Button text="Начать бесплатно" href={`/${locale}/login`} fullWidth />
                    </div>
                  </div>
                </div>
              ) : card.linkUrl ? (
                <a key={index} className={styles.card} href={card.linkUrl}>
                  <h3 className={styles.cardTitle}>{renderText(card.title)}</h3>
                  <p className={styles.cardDescription}>{renderText(card.description)}</p>
                  {card.linkText && <span className={styles.cardLink}>{renderText(card.linkText)}</span>}
                </a>
              ) : (
                <div key={index} className={styles.card}>
                  <h3 className={styles.cardTitle}>{renderText(card.title)}</h3>
                  <p className={styles.cardDescription}>{renderText(card.description)}</p>
                  {card.linkText && <span className={styles.cardLink}>{renderText(card.linkText)}</span>}
                </div>
              )
            ))}

            {/* Остальные карточки в свайпере */}
            {safe.cards.length > 2 && (
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
                  {safe.cards.slice(2).map((card, index) => (
                    <SwiperSlide key={index + 2}>
                      {card.isCta ? (
                        <div className={styles.ctaCard}>
                          <p className={styles.ctaCardText}>{renderText(card.description)}</p>
                          <div className={styles.ctaButton}>
                            <Button text="Начать бесплатно" href={`/${locale}/login`} fullWidth />
                          </div>
                        </div>
                      ) : card.linkUrl ? (
                        <a className={styles.card} href={card.linkUrl}>
                          <h3 className={styles.cardTitle}>{renderText(card.title)}</h3>
                          <p className={styles.cardDescription}>{renderText(card.description)}</p>
                          {card.linkText && <span className={styles.cardLink}>{renderText(card.linkText)}</span>}
                        </a>
                      ) : (
                        <div className={styles.card}>
                          <h3 className={styles.cardTitle}>{renderText(card.title)}</h3>
                          <p className={styles.cardDescription}>{renderText(card.description)}</p>
                          {card.linkText && <span className={styles.cardLink}>{renderText(card.linkText)}</span>}
                        </div>
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
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
        </motion.div>
      </div>
    </section>
  );
}

