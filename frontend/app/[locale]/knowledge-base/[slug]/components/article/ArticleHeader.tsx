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
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.description}>{description || ''}</div>
      </div>
      <div className={styles.readingTime}>
        <ClockIcon />
        <span>{readingMinutes} мин</span>
      </div>
    </header>
  );
}
