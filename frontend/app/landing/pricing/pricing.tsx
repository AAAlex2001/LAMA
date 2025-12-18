'use client';

import { useState, useEffect } from 'react';
import { useId } from 'react';
import { motion } from 'framer-motion';
import styles from "./pricing.module.scss";
import Button from "@/components/button/button";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function Pricing() {
  const gradientId768 = useId();
  const gradientId1440 = useId();

  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [plans, setPlans] = useState<Array<{
    title: string;
    price: string;
    features: string[];
    isHighlighted: boolean;
  }>>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pricing`)
      .then(res => res.json())
      .then(data => {
        if (data.headline) setHeadline(data.headline);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.description) setDescription(data.description);
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {});
  }, []);

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
    <section className={styles.pricing}>
      <svg 
        className={styles.decorationLine768}
        width="3710" 
        height="1443" 
        viewBox="0 0 3710 1443" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M9.34668 3.55566C44.3467 95.5557 607.347 1593.56 1414.35 1206.06C1526.85 1158.6 855.347 1964.06 3705.38 796.056" 
          stroke={`url(#${gradientId768})`} 
          strokeOpacity="0.1" 
          strokeWidth="20"
        />
        <defs>
          <linearGradient id={gradientId768} x1="610.738" y1="-209.077" x2="2317.85" y2="-209.077" gradientUnits="userSpaceOnUse">
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
        width="3710" 
        height="1443" 
        viewBox="0 0 3710 1443" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M9.34668 3.55566C44.3467 95.5557 607.347 1593.56 1414.35 1206.06C1526.85 1158.6 855.347 1964.06 3705.38 796.056" 
          stroke={`url(#${gradientId1440})`} 
          strokeOpacity="0.1" 
          strokeWidth="20"
        />
        <defs>
          <linearGradient id={gradientId1440} x1="610.738" y1="-209.077" x2="2317.85" y2="-209.077" gradientUnits="userSpaceOnUse">
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
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h1 className={styles.headline}>{renderText(headline)}</h1>
          <h2 className={styles.subtitle}>
            {renderText(subtitle)}
          </h2>
          <p className={styles.description}>
            {renderText(description)}
          </p>
        </motion.div>

        <div className={styles.cards}>
          <motion.div
            className={styles.planeIcon_2}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <img src="/hero_4.svg" alt="Pricing illustration" />
          </motion.div>

            <motion.div
            className={styles.planeIcon}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <img src="/hero_4.svg" alt="Pricing illustration" />
          </motion.div>
          {plans.map((plan, index) => (
            <motion.div 
              key={index} 
              className={styles.card}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.3 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{renderText(plan.title)}</h3>
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
                    <span>{renderText(feature)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.cardButton}>
                <Button text="Выбрать план" href="/login" fullWidth active={index === 1}/>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

