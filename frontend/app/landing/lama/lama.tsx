import styles from "./lama.module.scss";
import Button from "@/components/button/button";

export default function Lama() {
  return (
    <section className={styles.lama}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.headline}>Подписаться на Telegram-канал</h1>
          <p className={styles.channel}>@LamaPlanner</p>
          <p className={styles.description}>
            Присоединяйтесь к комьюнити SMM-специалистов и узнавайте о новых функциях <span className={styles.highlight}>LAMAplanner</span> раньше остальных
          </p>
          <div className={styles.buttonWrapper}>
            <Button text="Подписаться" href="/telegram-channel" active showArrow={false} fullWidth={true} />
          </div>
          <div className={styles.imageWrapper}>
            <img src="/lama.png" alt="Lama" className={styles.image} />
          </div>
        </div>
      </div>
    </section>
  );
}

