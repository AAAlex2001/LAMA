import type { ArticleSection } from '../../types';
import { slugify } from '../slugify';
import styles from './ArticleContent.module.scss';

type Props = { sections: ArticleSection[] };

function toRichHtml(value: string) {
  const withAccent = value.replace(/==([\s\S]+?)==/g, '<span class="kb-accent">$1</span>');
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(withAccent);
  return hasHtmlTags ? withAccent : withAccent.replace(/\n/g, '<br />');
}

export default function ArticleContent({ sections }: Props) {
  return (
    <article className={styles.content}>
      {sections.map((section, idx) => {
        if (section.type === 'text') {
          return (
            <section key={idx} className={styles.textBlock}>
              {section.title && (
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>{section.title}</h3>
              )}
              {section.body && <div className={styles.richText} dangerouslySetInnerHTML={{ __html: toRichHtml(section.body) }} />}
            </section>
          );
        }
        if (section.type === 'image') {
          return (
            <div key={idx} className={styles.singleImage}>
              {section.title && (
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>{section.title}</h3>
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
                <h3 id={slugify(section.title)} className={styles.sectionTitle}>{section.title}</h3>
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
        return null;
      })}
    </article>
  );
}
