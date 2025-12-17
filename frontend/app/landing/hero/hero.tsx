'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from "./hero.module.scss";
import Button from "@/components/button/button";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface HeroImage {
  url: string;
  alt: string;
}

interface HeroContent {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  images: HeroImage[];
}

export default function Hero() {
  const [content, setContent] = useState<HeroContent>({
    headline: "",
    paragraph: "",
    paragraphSecondary: "",
    buttonText: "",
    images: []
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/hero`)
      .then(res => res.json())
      .then(data => setContent(data))
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
    <section className={styles.hero}>
      <div className={styles.content}>
        <motion.div 
          className={styles.textContainer}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h1 className={styles.headline}>
            {renderText(content.headline)}
          </h1>
          <p className={styles.paragraph}>
            {renderText(content.paragraph)}
          </p>
          <p className={styles.paragraphSecondary}>
            {renderText(content.paragraphSecondary)}
          </p>
          <div className={styles.buttonContainer}>
            <Button text={content.buttonText} href="/login" />
          </div>
        </motion.div>
          {content.images.map((image, index) => {
            const delays = [0, 0.1, 0.2, 0, 0.2];
            const durations = [0.6, 0.6, 0.6, 0.8, 0.8];
            const classNames = [
              styles.relativeElement1,
              styles.relativeElement2,
              styles.relativeElement3,
              styles.relativeElement4,
              styles.relativeElement5
            ];
            
            return (
              <motion.div 
                key={index}
                className={classNames[index]}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: durations[index], ease: "easeOut", delay: delays[index] }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <img src={image.url} alt={image.alt} />
              </motion.div>
            );
          })}
      </div>
    </section>
  );
}

