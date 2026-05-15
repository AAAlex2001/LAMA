'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import styles from "./advantages.module.scss";
import { Button } from "@/components/new-button";
import { ArrowRightIcon } from "@/components/icons";
import Pagination from "@/components/pagination/pagination";

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
  ctaButtonText?: string | null;
  ctaButtonUrl?: string | null;
}

interface AdvantagesContent {
  headline: string;
  subtitle: string;
  cards: AdvantagesCard[];
}

export default function Advantages({ locale, content }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);

  const safe = {
    headline: content?.headline || '',
    subtitle: content?.subtitle || '',
    cards: Array.isArray(content?.cards) ? content.cards : [],
  };

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
                      <Button
                        href={card.ctaButtonUrl || `/${locale}/maintenance`}
                        variant="outline"
                        intent="gradient"
                        size="lg"
                        style={{ width: '100%' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {card.ctaButtonText || "Начать бесплатно"}
                          <ArrowRightIcon width={20} height={20} variant="gradient" />
                        </span>
                      </Button>
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
                            <Button
                              href={card.ctaButtonUrl || `/${locale}/maintenance`}
                              variant="outline"
                              intent="gradient"
                              size="lg"
                              style={{ width: '100%' }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                {card.ctaButtonText || "Начать бесплатно"}
                                <ArrowRightIcon width={20} height={20} variant="gradient" />
                              </span>
                            </Button>
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

          <Pagination onPrev={() => swiperRef.current?.slidePrev()} onNext={() => swiperRef.current?.slideNext()} />
        </motion.div>
      </div>
    </section>
  );
}

