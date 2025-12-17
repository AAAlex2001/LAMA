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

