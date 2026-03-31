'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import Pagination from '@/components/pagination/pagination';
import TemplateCard from './template-card';
import styles from './template-cards-block.module.scss';

type CardItem = {
  title: string;
  text: string;
  buttonText: string;
  buttonLink?: string | null;
};

type Props = {
  headline: string;
  cards: CardItem[];
};

export default function TemplateCardsBlock({ headline, cards }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);

  const safeHeadline = String(headline ?? '').trim();
  const safeCards = Array.isArray(cards) ? cards : [];

  if (!safeHeadline && safeCards.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div className={styles.headline}>{safeHeadline}</div>
          <Pagination
            onPrev={() => swiperRef.current?.slidePrev()}
            onNext={() => swiperRef.current?.slideNext()}
          />
        </div>

        <div className={styles.swiperContainer}>
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            className={styles.swiper}
            slidesPerView="auto"
            spaceBetween={24}
            loop={safeCards.length > 1}
          >
            {safeCards.map((c, idx) => (
              <SwiperSlide key={idx} className={styles.slide}>
                <TemplateCard
                  title={String(c.title ?? '')}
                  text={String(c.text ?? '')}
                  buttonText={String(c.buttonText ?? '')}
                  buttonLink={c.buttonLink ?? undefined}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
