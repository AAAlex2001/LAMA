'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import styles from "./advantages.module.scss";
import Button from "@/components/button/button";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface AdvantagesCard {
  title: string;
  description: string;
  isCta: boolean;
  linkText?: string | null;
}

export default function Advantages() {
  const swiperRef = useRef<SwiperType | null>(null);

  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [swiperCards, setSwiperCards] = useState<AdvantagesCard[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/advantages`)
      .then(res => res.json())
      .then(data => {
        if (data.headline) setHeadline(data.headline);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.cards && data.cards.length > 0) {
          setSwiperCards(data.cards);
        }
      })
      .catch(() => {});
  }, []);

  const renderHeadline = (text: string) => {
    // Парсим текст: **жирный** и "градиент"
    const parts = text.split(/(\*\*.*?\*\*|".*?")/);
    
    return parts.map((part, index) => {
      // Проверяем на **жирный**
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index} className={styles.bold}>{content}</strong>;
      }
      
      // Проверяем на "градиент"
      if (part.startsWith('"') && part.endsWith('"')) {
        const content = part.slice(1, -1);
        return <span key={index} className={styles.highlight}>{content}</span>;
      }
      
      // Обычный текст
      return <span key={index}>{part}</span>;
    });
  };

  const renderWithBold = (text: string) => {
    // Парсим текст: **жирный** и "градиент"
    const parts = text.split(/(\*\*.*?\*\*|".*?")/);
    
    return parts.map((part, index) => {
      // Проверяем на **жирный**
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index} className={styles.bold}>{content}</strong>;
      }
      
      // Проверяем на "градиент"
      if (part.startsWith('"') && part.endsWith('"')) {
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
            {renderHeadline(headline)}
          </h2>
          <p className={styles.subtitle}>
            {subtitle}
          </p>

          <div className={styles.cards}>
            {/* Первые 2 статичные карточки */}
            {swiperCards.slice(0, 2).map((card, index) => (
              <div key={index} className={styles.card}>
                {card.isCta ? (
                  <div className={styles.ctaCard}>
                    <p className={styles.ctaCardText}>{renderWithBold(card.description)}</p>
                    <div className={styles.ctaButton}>
                      <Button text="Начать бесплатно" href="/login" fullWidth />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className={styles.cardTitle}>{renderWithBold(card.title)}</h3>
                    <p className={styles.cardDescription}>{renderWithBold(card.description)}</p>
                    {card.linkText && <span className={styles.cardLink}>{renderWithBold(card.linkText)}</span>}
                  </>
                )}
              </div>
            ))}

            {/* Остальные карточки в свайпере */}
            {swiperCards.length > 2 && (
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
                  {swiperCards.slice(2).map((card, index) => (
                    <SwiperSlide key={index + 2}>
                      {card.isCta ? (
                        <div className={styles.ctaCard}>
                          <p className={styles.ctaCardText}>{renderWithBold(card.description)}</p>
                          <div className={styles.ctaButton}>
                            <Button text="Начать бесплатно" href="/login" fullWidth />
                          </div>
                        </div>
                      ) : (
                        <div className={styles.card}>
                          <h3 className={styles.cardTitle}>{renderWithBold(card.title)}</h3>
                          <p className={styles.cardDescription}>{renderWithBold(card.description)}</p>
                          {card.linkText && <span className={styles.cardLink}>{renderWithBold(card.linkText)}</span>}
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

