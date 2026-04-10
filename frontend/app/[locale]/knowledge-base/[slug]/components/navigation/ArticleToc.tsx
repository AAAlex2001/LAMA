import Link from 'next/link';
import styles from './ArticleToc.module.scss';
import type { NavigationCategory } from '../../types';

type Heading = { id: string; title: string };

type Props = {
  headings?: Heading[];
  fillPageHeight?: boolean;
  navigation?: NavigationCategory[];
  locale?: string;
  currentSlug?: string;
};

export default function ArticleToc({
  headings = [],
  fillPageHeight = false,
  navigation = [],
  locale = 'ru',
  currentSlug,
}: Props) {
  const tocClassName = fillPageHeight ? `${styles.toc} ${styles.tocFillPageHeight}` : styles.toc;
  const hasNavigation = navigation.length > 0;
  const headerTitle = hasNavigation ? 'Блоки знаний' : 'На этой странице';

  if (!headings.length && !hasNavigation) {
    return (
      <div className={tocClassName}>
        <div className={styles.header}>{headerTitle}</div>
        <div className={styles.body}>
          <div className={styles.subItem}>Нет разделов</div>
        </div>
        <div className={styles.illustration}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lama2.png" alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className={tocClassName}>
      <div className={styles.header}>{headerTitle}</div>
      <div className={styles.body}>
        {hasNavigation
          ? navigation.map((category) => {
              const containsCurrentArticle = category.entries.some((entry) => entry.slug === currentSlug);

              return (
                <div key={category.slug} className={styles.group}>
                  <div className={containsCurrentArticle ? styles.groupTitleBlue : styles.groupTitle}>
                    {category.title}
                  </div>
                  {category.entries.map((entry) => {
                    const isCurrentArticle = entry.slug === currentSlug;

                    return (
                      <div key={entry.slug} className={styles.pageBlock}>
                        <Link
                          href={`/${locale}/knowledge-base/${entry.slug}`}
                          className={isCurrentArticle ? styles.pageLinkActive : styles.pageLink}
                        >
                          {entry.title}
                        </Link>
                        {isCurrentArticle && headings.length > 0 && (
                          <div className={styles.pageSubList}>
                            {headings.map((heading) => (
                              <a key={heading.id} href={`#${heading.id}`} className={styles.pageSubItemLink}>
                                <span className={styles.pageSubItemDot} />
                                <span className={styles.pageSubItem}>{heading.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          : headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`} className={styles.tocLink}>
                {heading.title}
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
