'use client';

import TemplateCardsBlock from '@/components/template-card/template-cards-block';
import { Button } from '@/components/new-button';
import {
  SubNav,
  KnowledgeNavDropdown,
  ArticleHeader,
  ArticleContent,
  ArticleFeedback,
  ArticleToc,
  ArticleSectionsNav,
  DesktopConstrainedSticky,
} from './components';
import { slugify } from './components/slugify';
import styles from './KnowledgeArticleView.module.scss';
import type { KnowledgeArticle, KnowledgeArticleListItem, NavigationCategory } from './types';

type Props = {
  article: KnowledgeArticle;
  articles: KnowledgeArticleListItem[];
  isLoggedIn?: boolean;
  isEmbeddedInApp?: boolean;
  locale: string;
  navigation?: NavigationCategory[];
};

function stripHtml(value?: string | null) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function KnowledgeArticleView({ article, articles, isLoggedIn, isEmbeddedInApp = false, locale, navigation }: Props) {
  const viewerLoggedIn = Boolean(isLoggedIn);

  const headings = article.sections
    .filter((s) => 'title' in s && typeof s.title === 'string' && s.title.length > 0)
    .map((s) => ({ id: slugify((s as { title: string }).title), title: (s as { title: string }).title }));

  const cards = articles
    .filter((entry) => entry.slug !== article.slug)
    .map((entry) => ({
      title: entry.cardTitle || entry.title,
      text: stripHtml(entry.cardDescription || entry.description) || 'Нажмите чтобы узнать больше',
      buttonText: 'Читать',
      buttonLink: `/${locale}/knowledge-base/${entry.slug}`,
    }));

  const railClassName = viewerLoggedIn
    ? `${styles.sectionsRail} ${styles.sectionsRailWide} ${styles.sectionsRailLoggedIn}`
    : styles.sectionsRail;
  const articleShellClassName = viewerLoggedIn
    ? `${styles.articleShell} ${styles.articleShellLoggedIn}`
    : styles.articleShell;
  const pageClassName = isEmbeddedInApp
    ? `${styles.page} ${styles.pageEmbedded}`
    : styles.page;
  const layoutClassName = isEmbeddedInApp
    ? `${styles.layout} ${styles.layoutEmbedded}`
    : styles.layout;

  return (
    <div className={pageClassName}>
      <SubNav
        headings={headings}
        navigation={navigation}
        locale={locale}
        currentSlug={article.slug}
        isEmbeddedInApp={isEmbeddedInApp}
        isLoggedIn={viewerLoggedIn}
      />
      <div className={layoutClassName}>
        <div className={articleShellClassName} data-sticky-boundary="article">
          <aside className={viewerLoggedIn ? `${styles.sidebar} ${styles.sidebarLoggedIn}` : styles.sidebar}>
            {viewerLoggedIn ? (
              <DesktopConstrainedSticky top={20}>
                <KnowledgeNavDropdown
                  variant="sidebar"
                  headings={headings}
                  navigation={navigation}
                  locale={locale}
                  currentSlug={article.slug}
                  isLoggedIn
                />
              </DesktopConstrainedSticky>
            ) : (
              <DesktopConstrainedSticky top={95}>
                <KnowledgeNavDropdown
                  variant="sidebar"
                  headings={headings}
                  navigation={navigation}
                  locale={locale}
                  currentSlug={article.slug}
                />
              </DesktopConstrainedSticky>
            )}
          </aside>
          <div className={styles.main}>
            <ArticleHeader
              title={article.title}
              description={article.description}
              readingMinutes={article.readingMinutes}
            />
            <ArticleContent sections={article.sections} />
            {!viewerLoggedIn && (
              <ArticleFeedback
                articleSlug={article.slug}
                locale={locale}
              />
            )}
          </div>
          <aside className={railClassName}>
            {viewerLoggedIn ? (
              <div className={styles.sectionsRailSticky}>
                <ArticleToc
                  headings={headings}
                  fillPageHeight
                  navigation={navigation}
                  locale={locale}
                  currentSlug={article.slug}
                />
              </div>
            ) : (
              <DesktopConstrainedSticky top={110}>
                <ArticleSectionsNav article={article} />
              </DesktopConstrainedSticky>
            )}
          </aside>
        </div>

        {!viewerLoggedIn && (
          <div className={styles.extras}>
            <TemplateCardsBlock headline="Что почитать дальше" cards={cards} flush />
            <Button href={`/${locale}/register`} variant="fill" intent="gradient" size="lg" className={styles.registerCta}>
              Попробовать бесплатно
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
