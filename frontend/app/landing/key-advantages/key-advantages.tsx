'use client';

import { useState, useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import styles from "./key-advantages.module.scss";
import { API_BASE_URL } from "@/config";

interface KeyAdvantage {
  icon?: string | null;
  title: string;
  description: string;
}

export default function KeyAdvantages() {
  const gradientIdTabletLeft = useId();
  const gradientIdTabletRight = useId();
  const gradientIdDesktopLeft = useId();
  const gradientIdDesktopRight = useId();
  
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
        {/* Decorations for tablet/desktop */}
        <svg 
          className={styles.decorationLeftTablet}
          width="125" 
          height="134" 
          viewBox="0 0 125 134" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M61.1882 20.2661C-4.70136 47.8548 42.4035 88.7373 64.02 77.9329C81.1114 70.9044 98.2148 40.8195 61.1882 20.2661ZM61.1882 20.2661C111.031 13.0141 121.27 83.6832 119.028 133.248M61.1882 20.2661C43.0567 6.97416 1.18166 -3.38125 -28.0775 14.6716" 
            stroke={`url(#${gradientIdTabletLeft})`}
            strokeOpacity="0.1"
            strokeWidth="10"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdTabletLeft} x1="88.6642" y1="15.6168" x2="40.0861" y2="73.5099" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>

        <svg 
          className={styles.decorationRightTablet}
          width="164" 
          height="116" 
          viewBox="0 0 164 116" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M67.5077 71.9079C54.2084 10.8112 107.173 24.0611 110.279 44.9854C113.82 60.7694 100.835 88.1379 67.5077 71.9079ZM67.5077 71.9079C87.3325 111.288 168.733 122.623 203.147 96.1305M67.5077 71.9079C48.8736 65.5805 6.73732 30.3338 4.99165 0.290149" 
            stroke={`url(#${gradientIdTabletRight})`}
            strokeOpacity="0.1"
            strokeWidth="10"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdTabletRight} x1="77.969" y1="93.9436" x2="95.0906" y2="30.0448" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>

        <svg 
          className={styles.decorationLeftDesktop}
          width="209" 
          height="322" 
          viewBox="0 0 209 322" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M130.875 76.5777C-6.10949 87.8871 55.7847 190.713 101.768 183.794C137.225 181.094 186.414 136.208 130.875 76.5777ZM130.875 76.5777C226.401 92.9436 203.118 228.359 169.543 317.731M130.875 76.5777C105.598 41.4718 35.1223 -2.37845 -29.1574 13.2611" 
            stroke={`url(#${gradientIdDesktopLeft})`}
            strokeOpacity="0.1"
            strokeWidth="20"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdDesktopLeft} x1="183.922" y1="84.407" x2="60.5983" y2="161.468" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>

        <svg 
          className={styles.decorationRightDesktop}
          width="243" 
          height="270" 
          viewBox="0 0 243 270" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path 
            d="M193.902 124.941C180.449 224.182 107.992 175.226 114.78 142.032C118.096 116.335 152.632 82.2567 193.902 124.941ZM193.902 124.941C185.636 54.811 69.3312 -6.84163 3.0221 14.1801M193.902 124.941C218.482 144.672 262.592 220.804 248.761 266.979" 
            stroke={`url(#${gradientIdDesktopRight})`}
            strokeOpacity="0.1"
            strokeWidth="20"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
          />
          <defs>
            <linearGradient id={gradientIdDesktopRight} x1="190.228" y1="86.0449" x2="129.454" y2="172.839" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="0.5" stopColor="#2F67C3"/>
              <stop offset="0.75" stopColor="#295AAA"/>
              <stop offset="0.875" stopColor="#26539D"/>
              <stop offset="0.9375" stopColor="#244F96"/>
              <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
          </defs>
        </svg>

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

