'use client';

import {JSX, useEffect, useState} from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import styles from './template-block.module.scss';

interface TemplateBlockImage {
  url: string;
  alt: string;
}

interface TemplateBlockAdvantage {
  text: string;
}

interface TemplateBlockProps {
  title: string;
  subtitle: string;
  description: string;
  advantages?: TemplateBlockAdvantage[];
  image?: TemplateBlockImage;
  imagePosition?: 'left' | 'right';
  index: number;
}

function formatDescription(text: string) {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {

    const boldMatch = remaining.match(/^(.*?)``([^`]+)``(.*)$/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++} className={styles.bold}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    const gradientMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
    if (gradientMatch) {
      if (gradientMatch[1]) parts.push(gradientMatch[1]);
      parts.push(<span key={key++} className={styles.gradient}>{gradientMatch[2]}</span>);
      remaining = gradientMatch[3];
      continue;
    }

    parts.push(remaining);
    break;
  }
  return parts;
}

export default function TemplateBlock({
  title,
  subtitle,
  description,
  advantages,
  image,
  imagePosition = 'right',
  index,
}: TemplateBlockProps) {
  const [isMobile, setIsMobile] = useState(false);
  const hasSubtitle = Boolean(String(subtitle ?? '').trim());

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const imageSlide = image && (
    <div className={styles.imageContainer}>
      <img src={image.url} alt={image.alt} className={styles.image} />
    </div>
  );

  const contentSlide = (
    <div className={styles.content}>
      <div className={styles.textContainer}>
        <h1 className={styles.title}>{title}</h1>
        {hasSubtitle && <h2 className={styles.subtitle}>{subtitle}</h2>}
        <p className={styles.description}>{formatDescription(description)}</p>
      </div>

      {advantages && advantages.length > 0 && (
        <ul className={styles.advantages}>
          {advantages.map((advantage, idx) => (
            <li key={idx} className={styles.advantage}>
              <span className={styles.dot}></span>
              <span className={styles.advantageText}>{advantage.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const isLeft = imagePosition === 'left';

  if (isMobile) {
    return (
      <motion.div
        className={styles.block}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.1 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <Swiper
          className={styles.swiper}
          slidesPerView="auto"
          spaceBetween={16}
          dir={isLeft ? 'rtl' : 'ltr'}
        >
          <SwiperSlide className={styles.slide}>{contentSlide}</SwiperSlide>
          {image && <SwiperSlide className={styles.slideImage}>{imageSlide}</SwiperSlide>}
        </Swiper>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${styles.block} ${isLeft ? styles.imageLeft : ''}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {contentSlide}
      {imageSlide}
    </motion.div>
  );
}
