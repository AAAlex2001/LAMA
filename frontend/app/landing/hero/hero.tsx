import styles from "./hero.module.scss";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.textContainer}>
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
          <div className={styles.ctaButtonWrapper}>
            <a href="/login" className={styles.ctaButton}>
              <span className={styles.ctaButtonText}>Начать бесплатно</span>
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="url(#paint0_linear_1235_3114)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
            <linearGradient id="paint0_linear_1235_3114" x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6"/>
            <stop offset="0.5" stopColor="#2F67C3"/>
            <stop offset="0.75" stopColor="#295AAA"/>
            <stop offset="0.875" stopColor="#26539D"/>
            <stop offset="0.9375" stopColor="#244F96"/>
            <stop offset="1" stopColor="#234C90"/>
            </linearGradient>
            </defs>
            </svg>
            </a>
          </div>
        </div>
          <div className={styles.relativeElement1}>
              <img src="/hero_1.svg" alt="Hero illustration" />
            </div>
          <div className={styles.relativeElement2}>
              <img src="/hero_2.svg" alt="Hero illustration" />
            </div>
          <div className={styles.relativeElement3}>
              <img src="/hero_3.svg" alt="Hero illustration" />
            </div>
          <div className={styles.relativeElement4}>
              <img src="/hero_4.svg" alt="Hero illustration" />
            </div>
          <div className={styles.relativeElement5}>
              <img src="/hero_5.svg" alt="Hero illustration" />
            </div>
      </div>
    </section>
  );
}

