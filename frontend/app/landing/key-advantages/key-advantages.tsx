'use client';

import { motion } from 'framer-motion';
import styles from "./key-advantages.module.scss";

interface KeyAdvantage {
  icon?: string | null;
  title: string;
  description: string;
}

type KeyAdvantagesContent = {
  headline: string;
  advantages: KeyAdvantage[];
};

type Props = { locale: string; content: KeyAdvantagesContent };

export default function KeyAdvantages({ content }: Props) {
  const safeContent = {
    headline: content?.headline || '',
    advantages: Array.isArray(content?.advantages) ? content.advantages : [],
  };

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
    <section className={styles.keyAdvantages}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h1 className={styles.headline}>
            {safeContent.headline.split(/(LAMAplanner)/i).map((part, index) => 
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
          {safeContent.advantages.map((advantage, index) => (
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
              <h2 className={styles.cardTitle}>{renderText(advantage.title)}</h2>
              </div>
              <p className={styles.cardDescription}>{renderText(advantage.description)}</p>
            </div>
          ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

