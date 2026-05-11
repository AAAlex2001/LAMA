'use client';

import { useState, useId } from 'react';
import { motion } from 'framer-motion';
import styles from "./faq.module.scss";
import { Button } from "@/components/new-button";

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
  botLink?: string;
}

type FAQContent = {
  headline: string;
  faqItems: FAQItem[];
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  helpText?: string;
  botLink?: string;
};

type Props = {
  locale: string;
  content: FAQContent;
  whiteBackground?: boolean;
};

export default function FAQ({ content, whiteBackground = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseGradientId = useId();

  const actions: FAQActions = {
    primaryText: content?.primaryButtonText,
    primaryLink: content?.primaryButtonLink,
    secondaryText: content?.secondaryButtonText,
    secondaryLink: content?.secondaryButtonLink,
    helpText: content?.helpText,
    botLink: content?.botLink,
  };

  const safe = {
    headline: content?.headline || '',
    faqItems: Array.isArray(content?.faqItems) ? content.faqItems : [],
    actions,
  };

  const renderText = (text: string) => {
    const parts = text.split(/(```.*?```|``.*?``|`.*?`|@\w+)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        return <span key={index} className={styles.italic}>{part.slice(3, -3)}</span>;
      }
      if (part.startsWith('``') && part.endsWith('``')) {
        return <span key={index} className={styles.bold}>{part.slice(2, -2)}</span>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <span key={index} className={styles.highlight}>{part.slice(1, -1)}</span>;
      }
      if (part.startsWith('@')) {
        return <a key={index} href={safe.actions.botLink || 'https://t.me/LamaPlannerBot'} className={styles.botLink}>{part}</a>;
      }
      return <span key={index}>{part}</span>;
    });
  };


  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={`${styles.faq} ${whiteBackground ? styles.whiteBackground : ''}`}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className={styles.headline}>{renderText(safe.headline)}</h2>
          
          <div className={styles.items}>
          {safe.faqItems.map((item, index) => (
            <div 
              key={index} 
              className={`${styles.item} ${openIndex === index ? styles.open : ''}`}
            >
              <button 
                className={styles.questionButton}
                onClick={() => toggleItem(index)}
                aria-expanded={openIndex === index}
              >
                <span className={styles.question}>{renderText(item.question)}</span>
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
                  {renderText(item.answer)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button
            variant="fill"
            intent="gradient"
            href={safe.actions.primaryLink || "/knowledge-base"}
            style={{ width: '100%' }}
          >
            {safe.actions.primaryText || "База знаний"}
          </Button>
          <Button
            href={safe.actions.secondaryLink || "/telegram-channel"}
            style={{ width: '100%' }}
          >
            {safe.actions.secondaryText || "Telegram канал"}
          </Button>
        </div>

          <div className={styles.help}>
            <p className={styles.helpText}>
              {safe.actions.helpText ? renderText(safe.actions.helpText) : (
                <>
                  Не нашли ответ? Напишите нам в <a href={safe.actions.botLink || "https://t.me/LamaPlannerBot"} className={styles.botLink}>@LamaPlannerBot</a>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

