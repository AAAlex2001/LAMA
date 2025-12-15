'use client';

import { useState, useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import styles from "./faq.module.scss";
import Button from "@/components/button/button";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQActions {
  primaryText?: string;
  primaryLink?: string;
  secondaryText?: string;
  secondaryLink?: string;
  helpText?: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseGradientId = useId();
  const decorationGradientId = useId();

  const [headline, setHeadline] = useState('');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [actions, setActions] = useState<FAQActions>({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/faq`)
      .then(res => res.json())
      .then(data => {
        if (data.headline) setHeadline(data.headline);
        if (data.faqItems && data.faqItems.length > 0) {
          setFaqItems(data.faqItems);
        }
        setActions({
          primaryText: data.primaryText,
          primaryLink: data.primaryLink,
          secondaryText: data.secondaryText,
          secondaryLink: data.secondaryLink,
          helpText: data.helpText,
        });
      })
      .catch(() => {});
  }, []);

  const renderWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, index) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      const content = isBold ? part.slice(2, -2) : part;
      return isBold ? (
        <strong key={index} className={styles.bold}>{content}</strong>
      ) : (
        <span key={index}>{content}</span>
      );
    });
  };

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={styles.faq}>
      <div className={styles.container}>
        <svg 
          className={styles.decorationSvg}
          width="145" 
          height="330" 
          viewBox="0 0 145 330" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M-3.50895 320.8C12.4206 312.195 45.8834 283.604 52.2983 238.085C60.3169 181.186 59.5224 174.204 86.2462 167.727C112.97 161.251 117.995 195.353 98.7562 203.926C76.0715 214.036 53.1582 189.661 52.3101 164.749C52.0394 156.795 52.8657 147.968 55.4704 138.596C65.7534 101.596 87.3154 103.386 116.143 88.5864C132.884 79.9926 135.398 62.936 133.663 49.4609C132.528 40.649 127.068 33.1586 120.61 26.9557L120.068 26.4351C112.008 18.6937 101.919 13.3922 91.0074 11.1637C76.1872 8.13704 60.8603 10.9801 48.2934 19.0868L39.3697 24.8433C27.6395 32.4102 17.8261 42.7625 12.0472 55.4604C-22.6162 131.626 -5.73621 174.901 -9.08044 157.917" 
            stroke={`url(#${decorationGradientId})`} 
            strokeOpacity="0.1" 
            strokeWidth="20"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={decorationGradientId} x1="-38.0911" y1="177.633" x2="143.243" y2="156.999" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className={styles.headline}>{headline}</h2>
          
          <div className={styles.items}>
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className={`${styles.item} ${openIndex === index ? styles.open : ''}`}
            >
              <button 
                className={styles.questionButton}
                onClick={() => toggleItem(index)}
                aria-expanded={openIndex === index}
              >
                <span className={styles.question}>{item.question}</span>
                <svg 
                  className={styles.icon}
                  width="21" 
                  height="21" 
                  viewBox="0 0 21 21" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M10.2153 1.5V18.9305M1.5 10.2153H18.9305" 
                    stroke={`url(#${baseGradientId}-${index})`} 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id={`${baseGradientId}-${index}`} x1="1.5" y1="10.2153" x2="18.9305" y2="10.2153" gradientUnits="userSpaceOnUse">
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
              <div className={`${styles.answerWrapper} ${openIndex === index ? styles.open : ''}`}>
                <div className={styles.answer}>
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button 
            text={actions.primaryText || "База знаний"} 
            href={actions.primaryLink || "/knowledge-base"} 
            active={true} 
            fullWidth={true} 
            showArrow={false}
          />
          <Button 
            text={actions.secondaryText || "Telegram канал"} 
            href={actions.secondaryLink || "/telegram-channel"}  
            fullWidth={true} 
            showArrow={false}
          />
        </div>

          <div className={styles.help}>
            <p className={styles.helpText}>
              {actions.helpText ? renderWithBold(actions.helpText) : (
                <>
                  Не нашли ответ? Напишите нам в <span className={styles.botLink}>@LamaPlannerBot</span>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

