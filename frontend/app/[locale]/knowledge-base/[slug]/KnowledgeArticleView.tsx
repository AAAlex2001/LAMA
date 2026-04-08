import TemplateCardsBlock from '@/components/template-card/template-cards-block';
import { Button } from '@/components/new-button';
import {
  SubNav,
  KnowledgeNavDropdown,
  ArticleHeader,
  ArticleContent,
  ArticleFeedback,
  ArticleSectionsNav,
} from './components';
import { slugify } from './components/slugify';
import styles from './KnowledgeArticleView.module.scss';
import type { KnowledgeArticle } from './mock';

type Props = {
  article: KnowledgeArticle;
  isLoggedIn: boolean;
  locale: string;
};

export default function KnowledgeArticleView({ article, isLoggedIn, locale }: Props) {
  const headings = article.sections
    .filter((s) => 'title' in s && typeof s.title === 'string' && s.title.length > 0)
    .map((s) => ({ id: slugify((s as { title: string }).title), title: (s as { title: string }).title }));

  return (
    <div className={styles.page}>
      <SubNav headings={headings} />
      {!isLoggedIn && <ArticleSectionsNav article={article} />}
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <KnowledgeNavDropdown variant="sidebar" headings={headings} />
        </aside>
        <div className={styles.main}>
          <ArticleHeader
            title={article.title}
            description={article.description}
            readingMinutes={article.readingMinutes}
          />
          <ArticleContent sections={article.sections} />
          <ArticleFeedback />
          <div className={styles.relatedWrap}>
            <TemplateCardsBlock
              headline="Что почитать дальше"
              cards={article.related.map((c) => ({
                title: c.title,
                text: c.text,
                buttonText: c.buttonText,
                buttonLink: `/${locale}/knowledge-base/${c.slug}`,
              }))}
            />
          </div>
          {!isLoggedIn && (
            <Button href={`/${locale}/register`} variant="fill" intent="gradient" size="lg" className={styles.registerCta}>
              Зарегистрироваться бесплатно
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
