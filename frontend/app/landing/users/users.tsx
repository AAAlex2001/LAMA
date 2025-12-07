'use client';

import { useId } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import styles from "./users.module.scss";
import Button from "@/components/button/button";

export default function Users() {
  const gradientIdMobile = useId();
  const gradientIdTablet = useId();
  const gradientIdDesktop = useId();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, 500, {
        duration: 1,
        ease: "easeOut",
      });

      return controls.stop;
    }
  }, [isInView, count]);

  return (
    <section className={styles.users}>
      <div className={styles.backgroundRing}>
        <svg className={styles.ringMobile} width="360" height="523" viewBox="0 0 360 523" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            d="M370.484 0.231708C365.255 112.959 445.908 180.752 332.938 318.814M332.938 318.814C332.938 318.814 278.305 378.352 153 378.352C-60 378.352 -33.3477 113.297 142.871 85.3866C306.036 59.5437 393.099 186.852 332.938 318.814ZM332.938 318.814C306.046 373.713 227.557 501.891 -13.5001 517.352" 
            stroke={`url(#${gradientIdMobile})`}
            strokeOpacity="0.1"
            strokeWidth="10"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdMobile} x1="-269.863" y1="-218.31" x2="462.122" y2="-334.245" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
        <svg className={styles.ringTablet} width="768" height="717" viewBox="0 0 768 717" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            d="M1079 6.03775C1028.35 174.939 788.151 423.211 584.655 500.164M584.655 500.164C455.067 549.169 223 570.606 135.162 474.107C-28.2359 294.597 102.385 26.2384 377.271 6.03779C639 -13.196 779.004 237.787 584.655 500.164ZM584.655 500.164C360.873 802.276 -184.243 716.947 -327 629.606" 
            stroke={`url(#${gradientIdTablet})`}
            strokeOpacity="0.1"
            strokeWidth="10"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdTablet} x1="-507.246" y1="132.948" x2="1139.29" y2="132.948" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
        <svg className={styles.ringDesktop} width="1440" height="760" viewBox="0 0 1440 760" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            d="M1466.46 11.4782C1413.95 186.489 1164.93 443.741 953.964 523.478M953.964 523.478C819.617 574.255 557.571 560.285 487.964 496.478C277.964 303.978 453.983 32.4096 738.964 11.4782C1061.44 -12.2073 1155.45 251.61 953.964 523.478ZM953.964 523.478C721.964 836.517 77 761.495 -71 670.995" 
            stroke={`url(#${gradientIdDesktop})`}
            strokeOpacity="0.1"
            strokeWidth="20"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdDesktop} x1="-178.037" y1="142.979" x2="1528.96" y2="142.979" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className={styles.container}>
        <motion.div 
          className={styles.planeIcon_1}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <img src="/hero_4.svg" alt="Decoration" />
        </motion.div>
        <motion.div 
          className={styles.planeIcon_2}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <img src="/hero_4.svg" alt="Decoration" />
        </motion.div>
        <motion.div 
          className={styles.content} 
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={styles.number}>
            <motion.span>{rounded}</motion.span>+
          </div>
          <p className={styles.textLine}>пользователей доверяют</p>
          <div className={styles.brandName}>
            <span className={styles.brandLama}>LAMA</span>
            <span className={styles.brandPlanner}>planner</span>
          </div>
          <p className={styles.textLine_1}>Планируйте будущее вашего бренда вместе с нами</p>
          <Button text="Начать бесплатно" href="/login" active={true} />
        </motion.div>
      </div>
    </section>
  );
}

