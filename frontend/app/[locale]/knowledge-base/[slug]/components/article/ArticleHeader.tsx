import { ClockIcon } from '../icons';
import styles from './ArticleHeader.module.scss';

type Props = {
  title: string;
  description: string;
  readingMinutes: number;
};

export default function ArticleHeader({ title, description, readingMinutes }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>
          <span className={styles.gradientText}>{title}</span>
        </h1>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.readingTime}>
        <ClockIcon />
        <span>{readingMinutes} мин</span>
      </div>
    </header>
  );
}
