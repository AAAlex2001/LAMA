'use client';

import { useEffect, useState } from 'react';
import Header from '../../../landing/header/header';
import Footer from '../../../landing/footer/footer';
import LandingScrollBehavior from '../../../landing/LandingScrollBehavior';
import { AppLayout } from '@/components/app-layout';
import { getAuthToken } from '@/store/api';
import KnowledgeArticleView from './KnowledgeArticleView';
import type { KnowledgeArticle, KnowledgeArticleListItem, NavigationCategory } from './types';

const AUTH_ME_ENDPOINT = `${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/auth/me`;

type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

type Props = {
  article: KnowledgeArticle;
  articles: KnowledgeArticleListItem[];
  navigation: NavigationCategory[];
  footer: FooterContent;
  locale: string;
};

export default function KnowledgeArticlePageShell({ article, articles, navigation, footer, locale }: Props) {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'guest'>('checking');

  useEffect(() => {
    let isCancelled = false;

    async function resolveAuthState() {
      const token = getAuthToken();

      if (!token) {
        if (!isCancelled) {
          setAuthState('guest');
        }
        return;
      }

      try {
        const response = await fetch(AUTH_ME_ENDPOINT, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
            localStorage.removeItem('lamaplanner_access_token');
          }

          if (!isCancelled) {
            setAuthState('guest');
          }
          return;
        }

        if (!isCancelled) {
          setAuthState('authenticated');
        }
      } catch {
        if (!isCancelled) {
          setAuthState('guest');
        }
      }
    }

    resolveAuthState();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (authState === 'checking') {
    return null;
  }

  if (authState === 'authenticated') {
    return (
      <AppLayout pageTitle="База знаний">
        <KnowledgeArticleView
          article={article}
          articles={articles}
          isLoggedIn
          isEmbeddedInApp
          locale={locale}
          navigation={navigation}
        />
      </AppLayout>
    );
  }

  return (
    <main className="landing-page">
      <LandingScrollBehavior />
      <Header locale={locale} />
      <KnowledgeArticleView article={article} articles={articles} locale={locale} navigation={navigation} />
      <Footer locale={locale} content={footer} />
    </main>
  );
}