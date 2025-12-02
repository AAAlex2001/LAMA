'use client';

import { useState, useId } from 'react';
import styles from "./faq.module.scss";
import Button from "@/components/button/button";

const faqItems = [
  {
    question: "Можно ли использовать Lama Planner бесплатно?",
    answer: "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
  },
  {
    question: "Можно ли использовать Lama Planner бесплатно?",
    answer: "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
  },
  {
    question: "Можно ли использовать Lama Planner бесплатно?",
    answer: "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
  },
  {
    question: "Можно ли использовать Lama Planner бесплатно?",
    answer: "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
  },
  {
    question: "Можно ли использовать Lama Planner бесплатно?",
    answer: "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseGradientId = useId();

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={styles.faq}>
      <div className={styles.container}>
        <h2 className={styles.headline}>Часто задаваемые вопросы</h2>
        
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
          <Button text="База знаний" href="/knowledge-base" active={true} fullWidth={true} showArrow={false}/>
          <Button text="Telegram канал" href="/telegram-channel"  fullWidth={true} showArrow={false}/>
        </div>

        <div className={styles.help}>
          <p className={styles.helpText}>
            Не нашли ответ? Напишите нам в <span className={styles.botLink}>@LamaPlannerBot</span>
          </p>
        </div>
      </div>
    </section>
  );
}

