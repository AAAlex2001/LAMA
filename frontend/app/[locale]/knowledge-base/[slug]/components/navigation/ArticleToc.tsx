import styles from './ArticleToc.module.scss';

type Heading = { id: string; title: string };

type Props = {
  headings?: Heading[];
};

export default function ArticleToc({ headings = [] }: Props) {
  if (!headings.length) {
    return (
      <div className={styles.toc}>
        <div className={styles.header}>На этой странице</div>
        <div className={styles.body}>
          <div className={styles.subItem}>Нет разделов</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.toc}>
      <div className={styles.header}>На этой странице</div>
      <div className={styles.body}>
        {headings.map((h) => (
          <a key={h.id} href={`#${h.id}`} className={styles.tocLink}>
            {h.title}
          </a>
        ))}
      </div>
      <div className={styles.illustration}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lama2.png" alt="" />
      </div>
    </div>
  );
}
