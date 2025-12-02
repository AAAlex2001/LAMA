'use client';

import { motion } from 'framer-motion';
import styles from "./lama.module.scss";
import Button from "@/components/button/button";

export default function Lama() {
  return (
    <section className={styles.lama}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.headline}>Подписаться на Telegram-канал</h1>
            <p className={styles.channel}>@LamaPlanner</p>
            <p className={styles.description}>
              Присоединяйтесь к комьюнити SMM-специалистов и узнавайте о новых функциях <span className={styles.highlight}><span className={styles.lamaText}>LAMA</span>planner</span> раньше остальных
            </p>
            <div className={styles.buttonWrapper}>
              <Button text="Подписаться" href="/telegram-channel" active showArrow={false} fullWidth={true} />
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

