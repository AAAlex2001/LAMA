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
import type { KnowledgeArticle, NavigationCategory } from './types';

type Props = {
  article: KnowledgeArticle;
  isLoggedIn: boolean;
  locale: string;
  navigation?: NavigationCategory[];
};

export default function KnowledgeArticleView({ article, isLoggedIn, locale, navigation }: Props) {
  const headings = article.sections
    .filter((s) => 'title' in s && typeof s.title === 'string' && s.title.length > 0)
    .map((s) => ({ id: slugify((s as { title: string }).title), title: (s as { title: string }).title }));

  return (
    <div className={styles.page}>
      <SubNav headings={headings} navigation={navigation} currentSlug={article.slug} />
      {!isLoggedIn && <ArticleSectionsNav article={article} />}
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <KnowledgeNavDropdown variant="sidebar" headings={headings} navigation={navigation} currentSlug={article.slug} />
        </aside>
        <div className={styles.main}>
          <ArticleHeader
            title={article.title}
            description={article.description}
            readingMinutes={article.readingMinutes}
          />
          <ArticleContent sections={article.sections} />
          <ArticleFeedback
            articleSlug={article.slug}
            locale={locale}
            initialLikes={article.likesCount}
            initialDislikes={article.dislikesCount}
          />
          <div className={styles.relatedWrap}>
            <TemplateCardsBlock
              headline="Что почитать дальше"
              cards={article.related.map((c) => ({
                title: c.title,
                text: c.description || 'Нажмите чтобы узнать больше',
                buttonText: 'Читать',
                buttonLink: `/${locale}/knowledge-base/${c.slug}`,
              }))}
            />
          </div>
          {!isLoggedIn && (
            <Button href={`/${locale}/register`} variant="fill" intent="gradient" size="lg" className={styles.registerCta}>
              Попробовать бесплатно
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
