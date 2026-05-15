'use client';

import { motion } from 'framer-motion';
import styles from "./hero.module.scss";
import { Button } from "@/components/new-button";
import { ArrowRightIcon } from "@/components/icons";

type Props = {
  locale: string;
  content: HeroContent;
  hideImagesOnMobile?: boolean;
  variant?: 'default' | 'template';
};

interface HeroImage {
  url: string;
  alt: string;
}

interface HeroContent {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  buttonUrl?: string;
  images: HeroImage[];
}

export default function Hero({ locale, content, hideImagesOnMobile = false, variant = 'default' }: Props) {
  const safeContent = {
    headline: content?.headline || "",
    paragraph: content?.paragraph || "",
    paragraphSecondary: (content as any)?.paragraphSecondary || "",
    buttonText: content?.buttonText || "",
    buttonUrl: content?.buttonUrl || "",
    images: Array.isArray(content?.images) ? content.images : [],
  };

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
    <section className={`${styles.hero} ${variant === 'template' ? styles.templateRow : ''}`}>
      <div className={styles.content}>
        <motion.div 
          className={styles.textContainer}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h1 className={styles.headline}>
            {renderText(safeContent.headline)}
          </h1>
          <p className={styles.paragraph}>
            {renderText(safeContent.paragraph)}
          </p>
          {variant !== 'template' && safeContent.paragraphSecondary ? (
            <p className={styles.paragraphSecondary}>
              {renderText(safeContent.paragraphSecondary)}
            </p>
          ) : null}
          <div className={styles.buttonContainer}>
            <Button
              href={safeContent.buttonUrl || `/${locale}/maintenance`}
              variant="outline"
              intent="gradient"
              size="lg"
              className={styles.heroBtn}
            >
              <span className={styles.buttonInner}>
                {safeContent.buttonText}
                <ArrowRightIcon width={20} height={20} variant="gradient" />
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
      <div className={`${styles.images} ${hideImagesOnMobile ? styles.hideOnMobile : ''}`}>
        {safeContent.images.map((image, index) => {
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
            <motion.img 
              key={index}
              className={classNames[index]}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: durations[index], ease: "easeOut", delay: delays[index] }}
              viewport={{ once: true, amount: 0.3 }}
              src={image.url} 
              alt={image.alt}
            />
          );
        })}
      </div>
    </section>
  );
}

