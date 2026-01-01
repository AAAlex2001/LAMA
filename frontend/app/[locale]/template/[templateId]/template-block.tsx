'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './template-block.module.scss';

interface TemplateBlockImage {
  url: string;
  alt: string;
}

interface TemplateBlockAdvantage {
  text: string;
}

interface TemplateBlockProps {
  title: string;
  subtitle: string;
  description: string;
  advantages?: TemplateBlockAdvantage[];
  image?: TemplateBlockImage;
  index: number;
}

export default function TemplateBlock({
  title,
  subtitle,
  description,
  advantages,
  image,
  index,
}: TemplateBlockProps) {
  return (
    <motion.div
      className={styles.block}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {image && (
        <div className={styles.imageContainer}>
          <img
            src={image.url}
            alt={image.alt}
            className={styles.image}
          />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.textContainer}>
          <h2 className={styles.title}>{title}</h2>
          <h3 className={styles.subtitle}>{subtitle}</h3>
          <p className={styles.description}>{description}</p>
        </div>

        {advantages && advantages.length > 0 && (
          <ul className={styles.advantages}>
            {advantages.map((advantage, idx) => (
              <li key={idx} className={styles.advantage}>
                <span className={styles.dot}></span>
                <span className={styles.advantageText}>{advantage.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
