import styles from "./hero.module.scss";
import Button from "@/components/button/button";

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
          <div className={styles.buttonContainer}>
            <Button text="Начать бесплатно" href="/login" />
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

