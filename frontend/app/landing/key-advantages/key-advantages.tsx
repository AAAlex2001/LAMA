'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from "./key-advantages.module.scss";
import { API_BASE_URL } from "@/config";

interface KeyAdvantage {
  icon?: string | null;
  title: string;
  description: string;
}

export default function KeyAdvantages() {
  const [headline, setHeadline] = useState('');
  const [advantages, setAdvantages] = useState<KeyAdvantage[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/key-advantages`)
      .then(res => res.json())
      .then(data => {
        if (data.headline) setHeadline(data.headline);
        if (data.advantages && data.advantages.length > 0) {
          setAdvantages(data.advantages);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className={styles.keyAdvantages}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h1 className={styles.headline}>
            {headline.split(/(LAMAplanner)/i).map((part, index) => 
              part.toLowerCase() === 'lamaplanner' ? (
                <span key={index} className={styles.highlight}>
                  <span className={styles.lama}>LAMA</span>planner
                </span>
              ) : (
                <span key={index}>{part}</span>
              )
            )}
          </h1>
          
          <div className={styles.cards}>
          {advantages.map((advantage, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.cardHeader}>
              <div className={styles.icon}>
                {advantage.icon ? (
                  typeof advantage.icon === 'string' ? (
                    advantage.icon.startsWith('<svg') ? (
                      <div dangerouslySetInnerHTML={{ __html: advantage.icon }} />
                    ) : (
                      <img src={advantage.icon} alt={advantage.title} />
                    )
                  ) : (
                    advantage.icon
                  )
                ) : null}
              </div>
              <h2 className={styles.cardTitle}>{advantage.title}</h2>
              </div>
              <p className={styles.cardDescription}>{advantage.description}</p>
            </div>
          ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

