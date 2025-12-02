'use client';

import Marquee from "react-fast-marquee";
import styles from "./marquee.module.scss";

export default function MarqueeComponent() {
  return (
    <section className={styles.marquee}>
      <Marquee className={styles.marqueeContainer} speed={90} gradient={false}>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
        <span className={styles.text}>LAMAPLANNER</span>
      </Marquee>
    </section>
  );
}

