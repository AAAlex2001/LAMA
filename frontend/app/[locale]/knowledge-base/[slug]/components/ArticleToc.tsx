import styles from './ArticleToc.module.scss';

const CREATE_SUB = ['Что это такое', 'Как создать публикацию', 'Кнопки', 'Частые ошибки'];
const LIMITS_SUB = ['Если текст просто', 'Если текст с медиафайлами'];

export default function ArticleToc() {
  return (
    <div className={styles.toc}>
      <div className={styles.header}>На этой странице</div>
      <div className={styles.body}>
        <div className={styles.group}>
          <div className={styles.groupTitleBlue}>Создание публикации</div>
          <div className={styles.subList}>
            {CREATE_SUB.map((t) => (
              <div key={t} className={styles.subItem}>{t}</div>
            ))}
          </div>
        </div>
        <div className={styles.groupTitle}>Шаблоны и черновики</div>
        <div className={styles.group}>
          <div className={styles.groupTitle}>Лимиты</div>
          <div className={styles.subList}>
            {LIMITS_SUB.map((t) => (
              <div key={t} className={styles.subItem}>{t}</div>
            ))}
          </div>
        </div>
        <div className={styles.groupTitle}>Факты</div>
      </div>
      <div className={styles.illustration}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lama.png" alt="" />
      </div>
    </div>
  );
}
