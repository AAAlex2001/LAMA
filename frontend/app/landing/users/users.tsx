'use client';

import { useId, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import styles from "./users.module.scss";
import { Button } from "@/components/new-button";

type UsersContent = {
  number: number;
  textLine: string;
  textLine_1: string;
  buttonText: string;
  buttonUrl?: string;
};

type Props = { locale: string; content: UsersContent };

export default function Users({ locale, content }: Props) {
  const gradientIdMobile = useId();
  const gradientIdTablet = useId();
  const gradientIdDesktop = useId();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  const safeContent = {
    number: Number(content?.number || 0),
    textLine: content?.textLine || '',
    textLine_1: content?.textLine_1 || '',
    buttonText: content?.buttonText || '',
    buttonUrl: content?.buttonUrl || '',
  };

  useEffect(() => {
    if (isInView && safeContent.number > 0) {
      const controls = animate(count, safeContent.number, {
        duration: 1,
        ease: "easeOut",
      });

      return controls.stop;
    }
  }, [isInView, count, safeContent.number]);

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
        return <span key={index} className={styles.gradient}>{content}</span>;
      }
      
      // Обычный текст
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <section className={styles.users}>
      <div className={styles.backgroundRing}>
        <svg className={styles.ringMobile} width="1440" height="2852" viewBox="0 0 1440 2852" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M4162.5 -244.5C4109.99 -69.489 1429.5 2537.5 964 2621.5M964 2621.5C829.653 2672.28 614.303 2689.15 474.5 2561C334.697 2432.85 446.019 2103.93 731 2083C1053.48 2059.31 1165.49 2349.63 964 2621.5ZM964 2621.5C474.5 3377 -3022.5 1975.97 -4091 1598" 
            stroke={`url(#${gradientIdMobile})`}
            strokeOpacity="0.5"
            strokeWidth="20"
          />
          <defs>
            <linearGradient id={gradientIdMobile} x1="-178.036" y1="2233.98" x2="1528.97" y2="2233.98" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
        <svg className={styles.ringTablet} width="1440" height="2852" viewBox="0 0 1440 2852" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M4162.5 -244.5C4109.99 -69.489 1429.5 2537.5 964 2621.5M964 2621.5C829.653 2672.28 614.303 2689.15 474.5 2561C334.697 2432.85 446.019 2103.93 731 2083C1053.48 2059.31 1165.49 2349.63 964 2621.5ZM964 2621.5C474.5 3377 -3022.5 1975.97 -4091 1598" 
            stroke={`url(#${gradientIdTablet})`}
            strokeOpacity="0.5"
            strokeWidth="20"
          />
          <defs>
            <linearGradient id={gradientIdTablet} x1="-178.036" y1="2233.98" x2="1528.97" y2="2233.98" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
        <svg className={styles.ringDesktop} width="1440" height="2852" viewBox="0 0 1440 2852" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M4162.5 -244.5C4109.99 -69.489 1429.5 2537.5 964 2621.5M964 2621.5C829.653 2672.28 614.303 2689.15 474.5 2561C334.697 2432.85 446.019 2103.93 731 2083C1053.48 2059.31 1165.49 2349.63 964 2621.5ZM964 2621.5C474.5 3377 -3022.5 1975.97 -4091 1598" 
            stroke={`url(#${gradientIdDesktop})`}
            strokeOpacity="0.5"
            strokeWidth="20"
          />
          <defs>
            <linearGradient id={gradientIdDesktop} x1="-178.036" y1="2233.98" x2="1528.97" y2="2233.98" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className={styles.container}>
        <motion.div 
          className={styles.planeIcon_1}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <img src="/hero_4.svg" alt="Decoration" />
        </motion.div>
        <motion.div 
          className={styles.planeIcon_2}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <img src="/hero_4.svg" alt="Decoration" />
        </motion.div>
        <motion.div 
          className={styles.content} 
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={styles.number}>
            <motion.span>{rounded}</motion.span>+
          </div>
          <p className={styles.textLine}>{renderText(safeContent.textLine)}</p>
          <div className={styles.brandName}>
            <span className={styles.brandLama}>LAMA</span>
            <span className={styles.brandPlanner}>planner</span>
          </div>
          <p className={styles.textLine_1}>{renderText(safeContent.textLine_1)}</p>
          <Button
            variant="fill"
            intent="gradient"
            href={safeContent.buttonUrl || `/${locale}/maintenance`}
          >
            {safeContent.buttonText || "Начать бесплатно"}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

