'use client';

import { motion } from 'framer-motion';
import styles from "./hero.module.scss";
import Button from "@/components/button/button";

export default function Hero() {
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
            Управляйте сообществами и ботами Telegram в одном месте
          </h1>
          <p className={styles.paragraph}>
            Экономьте время на рутине и увеличивайте
            охваты с помощью <span className={styles.highlight}>LAMAplanner</span>
          </p>
          <p className={styles.paragraphSecondary}>
            Вы здесь не случайно: нужный сервис
            перед вами
          </p>
          <div className={styles.buttonContainer}>
            <Button text="Начать бесплатно" href="/login" />
          </div>
        </motion.div>
          <motion.div 
            className={styles.relativeElement1}
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
              <img src="/hero_1.svg" alt="Hero illustration" />
            </motion.div>
          <motion.div 
            className={styles.relativeElement2}
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            viewport={{ once: true, amount: 0.3 }}
          >
              <img src="/hero_2.svg" alt="Hero illustration" />
            </motion.div>
          <motion.div 
            className={styles.relativeElement3}
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
          >
              <img src="/hero_3.svg" alt="Hero illustration" />
            </motion.div>
          <motion.div 
            className={styles.relativeElement4}
            initial={{ opacity: 0, x: 200 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
              <img src="/hero_4.svg" alt="Hero illustration" />
            </motion.div>
          <motion.div 
            className={styles.relativeElement5}
            initial={{ opacity: 0, x: -200 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
          >
              <img src="/hero_5.svg" alt="Hero illustration" />
            </motion.div>
      </div>
    </section>
  );
}

