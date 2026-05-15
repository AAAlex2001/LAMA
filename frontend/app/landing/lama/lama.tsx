'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from "./lama.module.scss";
import { Button } from "@/components/new-button";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function Lama() {
  const [headline, setHeadline] = useState('');
  const [channel, setChannel] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonHref, setButtonHref] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/lama`)
      .then(res => res.json())
      .then(data => {
        if (data.headline) setHeadline(data.headline);
        if (data.channel) setChannel(data.channel);
        if (data.description) setDescription(data.description);
        if (data.buttonText) setButtonText(data.buttonText);
        if (data.buttonHref) setButtonHref(data.buttonHref);
      })
      .catch(() => {});
  }, []);

  const renderText = (text: string) => {
    const parts = text.split(/(```.*?```|``.*?``|`.*?`)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const content = part.slice(3, -3);
        return <span key={index} className={styles.italic}>{content}</span>;
      }
      
      if (part.startsWith('``') && part.endsWith('``')) {
        const content = part.slice(2, -2);
        return <span key={index} className={styles.bold}>{content}</span>;
      }
      
      if (part.startsWith('`') && part.endsWith('`')) {
        const content = part.slice(1, -1);
        return <span key={index} className={styles.gradient}>{content}</span>;
      }
      
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <section className={styles.lama}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.headline}>{renderText(headline)}</h1>
            <p className={styles.channel}>{renderText(channel)}</p>
            <p className={styles.description}>
              {description.split('LAMAplanner').map((part, index, array) => 
                index < array.length - 1 ? (
                  <span key={index}>
                    {part}
                    <span className={styles.highlight}><span className={styles.lamaText}>LAMA</span>planner</span>
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )
              )}
            </p>
            <div className={styles.buttonWrapper}>
              <Button
                variant="fill"
                intent="gradient"
                href={buttonHref}
                style={{ width: '100%' }}
              >
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
        <motion.div 
          className={styles.imageWrapper}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <img src="/lama.png" alt="Lama" className={styles.image} />
        </motion.div>
      </div>
    </section>
  );
}

