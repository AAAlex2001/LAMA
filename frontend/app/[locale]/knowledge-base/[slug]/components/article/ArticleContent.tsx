import type { ArticleSection } from '../../types';
import { slugify } from '../slugify';
import styles from './ArticleContent.module.scss';

type Props = { sections: ArticleSection[] };

function Gradient({ text }: { text: string }) {
  if (!text.includes('==')) return <>{text}</>;
  const result: React.ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (rest.length > 0) {
    const start = rest.indexOf('==');
    if (start === -1) { result.push(rest); break; }
    const end = rest.indexOf('==', start + 2);
    if (end === -1) { result.push(rest); break; }
    if (start > 0) result.push(rest.slice(0, start));
    result.push(<span key={i++} className={styles.gradientText}>{rest.slice(start + 2, end)}</span>);
    rest = rest.slice(end + 2);
  }
  return <>{result}</>;
}

export default function ArticleContent({ sections }: Props) {
  return (
    <article className={styles.content}>
      {sections.map((section, idx) => {
        if (section.type === 'text') {
          return (
            <section key={idx} className={styles.textBlock}>
              {section.title && (
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>
                  <span className={styles.gradientText}>{section.title}</span>
                </h3>
              )}
              {section.body && <p className={styles.paragraph}><Gradient text={section.body} /></p>}
              {section.items?.map((item, i) => (
                <p key={i} className={styles.paragraph}><Gradient text={item} /></p>
              ))}
            </section>
          );
        }
        if (section.type === 'image') {
          return (
            <div key={idx} className={styles.singleImage}>
              {section.title && (
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>
                  <span className={styles.gradientText}>{section.title}</span>
                </h3>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.src} alt={section.alt || ''} />
            </div>
          );
        }
        if (section.type === 'image-pair') {
          return (
            <div key={idx} className={styles.pairImagesWrap}>
              {section.title && (
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>
                  <span className={styles.gradientText}>{section.title}</span>
                </h3>
              )}
              <div className={styles.pairImages}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={section.src1} alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={section.src2} alt="" />
              </div>
            </div>
          );
        }
        if (section.type === 'errors') {
          return (
            <section key={idx} className={styles.errorsBlock}>
              <h3 id={slugify(section.title)} className={styles.sectionTitle}>
                <span className={styles.gradientText}>{section.title}</span>
              </h3>
              {section.items.map((item, i) => (
                <p key={i} className={styles.paragraph}><Gradient text={item} /></p>
              ))}
            </section>
          );
        }
        return null;
      })}
    </article>
  );
}
