import styles from "./advantages.module.scss";

export default function Advantages() {
  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <h2 className={styles.headline}>
          Всё для <span className={styles.highlight}>продуктивной</span>{" "}
          <span className={styles.highlight}>и</span>{" "}
          <span className={styles.highlight}>лёгкой</span> работы с контентом
        </h2>
        <p className={styles.subtitle}>
          Профессиональный инструмент для тех, кто ценит порядок и эффективность
        </p>

        <div className={styles.cards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Постинг и планирование</h3>
            <p className={styles.cardDescription}>
              Создавайте публикации: текст, медиа, кнопки, опросы и AI-редактор — всё в одном окне. Планируйте серии, создавайте отложенные публикации, включайте автопостинг, автоудаление и мультипостинг в несколько каналов одновременно.
            </p>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Рекламный кабинет</h3>
            <p className={styles.cardDescription}>
              Создавайте рекламные посты, генерируйте ссылки-приглашения, заполняйте таблицы проданных и свободных мест, ведите отчёт о доходах и расходах и анализируйте прирост подписчиков после каждой рекламной кампании.
            </p>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Создавайте ботов</h3>
            <p className={styles.cardDescription}>
              Подключай ботов по токену @BotFather и управляй ими. Приветственные боты и боты обратной связи легко и быстро настраиваются
            </p>
          </div>
        </div>

        <div className={styles.navigation}>
          <button className={styles.navButton} aria-label="Предыдущий">
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
              <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="url(#paint0_linear_left)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear_left" x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="0.5" stopColor="#2F67C3"/>
                  <stop offset="0.75" stopColor="#295AAA"/>
                  <stop offset="0.875" stopColor="#26539D"/>
                  <stop offset="0.9375" stopColor="#244F96"/>
                  <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
          <button className={styles.navButton} aria-label="Следующий">
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="url(#paint0_linear_right)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear_right" x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="0.5" stopColor="#2F67C3"/>
                  <stop offset="0.75" stopColor="#295AAA"/>
                  <stop offset="0.875" stopColor="#26539D"/>
                  <stop offset="0.9375" stopColor="#244F96"/>
                  <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

