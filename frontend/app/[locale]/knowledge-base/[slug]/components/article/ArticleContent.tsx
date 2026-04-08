import type { ArticleSection } from '../../mock';
import styles from './ArticleContent.module.scss';

type Props = { sections: ArticleSection[] };

export default function ArticleContent({ sections }: Props) {
  return (
    <article className={styles.content}>
      {sections.map((section, idx) => {
        if (section.type === 'text') {
          return (
            <section key={idx} className={styles.textBlock}>
              {section.title && (
                <h3 className={styles.sectionTitle}>
                  <span className={styles.gradientText}>{section.title}</span>
                </h3>
              )}
              {section.body && <p className={styles.paragraph}>{section.body}</p>}
            </section>
          );
        }
        if (section.type === 'image') {
          return (
            <div key={idx} className={styles.singleImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.src} alt={section.alt || ''} />
            </div>
          );
        }
        if (section.type === 'image-pair') {
          return (
            <div key={idx} className={styles.pairImages}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.src1} alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.src2} alt="" />
            </div>
          );
        }
        if (section.type === 'errors') {
          return (
            <section key={idx} className={styles.errorsBlock}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.gradientText}>{section.title}</span>
              </h3>
              {section.items.map((item, i) => (
                <p key={i} className={styles.paragraph}>{item}</p>
              ))}
            </section>
          );
        }
        return null;
      })}
    </article>
  );
}
