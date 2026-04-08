import TemplateCardsBlock from '@/components/template-card/template-cards-block';
import SubNav from './components/SubNav';
import KnowledgeNavDropdown from './components/KnowledgeNavDropdown';
import ArticleHeader from './components/ArticleHeader';
import ArticleContent from './components/ArticleContent';
import ArticleFeedback from './components/ArticleFeedback';
import RegisterCta from './components/RegisterCta';
import styles from './KnowledgeArticleView.module.scss';
import type { KnowledgeArticle } from './mock';

type Props = {
  article: KnowledgeArticle;
  isLoggedIn: boolean;
  locale: string;
};

export default function KnowledgeArticleView({ article, isLoggedIn, locale }: Props) {
  return (
    <div className={styles.page}>
      <SubNav />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <KnowledgeNavDropdown variant="sidebar" />
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
          {!isLoggedIn && <RegisterCta href={`/${locale}/register`} />}
        </div>
      </div>
    </div>
  );
}
