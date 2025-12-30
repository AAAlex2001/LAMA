import Header from "../landing/header/header";
import Hero from "../landing/hero/hero";
import Advantages from "../landing/advantages/advantages";
import Users from "../landing/users/users";
import KeyAdvantages from "../landing/key-advantages/key-advantages";
import Pricing from "../landing/pricing/pricing";
import FAQ from "../landing/faq/faq";
import FAQDecoration from "../landing/faq-decoration/faq-decoration";
import Footer from "../landing/footer/footer";
import SidebarMenu from "@/components/sidebar-menu/sidebar-menu";
import { headers } from "next/headers";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return [
    { locale: 'ru' },
    { locale: 'sr' },
    { locale: 'en' },
  ];
}

type HeroContent = {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  images: Array<{ url: string; alt: string }>;
};

type AdvantagesContent = {
  headline: string;
  subtitle: string;
  cards: Array<{
    title: string;
    description: string;
    isCta: boolean;
    linkText?: string | null;
    linkUrl?: string | null;
  }>;
};

type UsersContent = {
  number: number;
  textLine: string;
  textLine_1: string;
  buttonText: string;
};

type KeyAdvantagesContent = {
  headline: string;
  advantages: Array<{ icon?: string | null; title: string; description: string }>;
};

type PricingContent = {
  headline: string;
  subtitle: string;
  description: string;
  plans: Array<{ title: string; price: string; features: string[]; isHighlighted: boolean }>;
};

type FAQContent = {
  headline: string;
  faqItems: Array<{ question: string; answer: string }>;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  helpText?: string;
  botLink?: string;
};

type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

async function getApiBaseUrl(): Promise<string> {
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(envBase)) return envBase;

  const h = await headers();
  const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  if (!host) return envBase;

  const basePath = envBase.startsWith('/') ? envBase : `/${envBase}`;
  return `${proto}://${host}${basePath}`;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function LocalePage({ params }: Props) {
  const { locale } = await params;

  const apiBaseUrl = await getApiBaseUrl();

  const heroFallback: HeroContent = {
    headline: '',
    paragraph: '',
    paragraphSecondary: '',
    buttonText: '',
    images: [],
  };
  const advantagesFallback: AdvantagesContent = { headline: '', subtitle: '', cards: [] };
  const usersFallback: UsersContent = { number: 0, textLine: '', textLine_1: '', buttonText: '' };
  const keyAdvantagesFallback: KeyAdvantagesContent = { headline: '', advantages: [] };
  const pricingFallback: PricingContent = { headline: '', subtitle: '', description: '', plans: [] };
  const faqFallback: FAQContent = { headline: '', faqItems: [] };
  const footerFallback: FooterContent = { brandName: '', copyright: '', telegramLink: '', instagramLink: '', columns: [] };

  const [hero, advantages, users, keyAdvantages, pricing, faq, footer] = await Promise.all([
    fetchJson<HeroContent>(`${apiBaseUrl}/hero?locale=${locale}`, heroFallback),
    fetchJson<AdvantagesContent>(`${apiBaseUrl}/advantages?locale=${locale}`, advantagesFallback),
    fetchJson<UsersContent>(`${apiBaseUrl}/users?locale=${locale}`, usersFallback),
    fetchJson<KeyAdvantagesContent>(`${apiBaseUrl}/key-advantages?locale=${locale}`, keyAdvantagesFallback),
    fetchJson<PricingContent>(`${apiBaseUrl}/pricing?locale=${locale}`, pricingFallback),
    fetchJson<FAQContent>(`${apiBaseUrl}/faq?locale=${locale}`, faqFallback),
    fetchJson<FooterContent>(`${apiBaseUrl}/footer?locale=${locale}`, footerFallback),
  ]);

  return (
    <main>
      <Header locale={locale} />
      <Hero locale={locale} content={hero} />
      <div id="advantages">
        <Advantages locale={locale} content={advantages} />
      </div>
      <div id="users">
        <Users locale={locale} content={users} />
      </div>
      <div id="key-advantages">
        <KeyAdvantages locale={locale} content={keyAdvantages} />
      </div>
      <div id="pricing">
        <Pricing locale={locale} content={pricing} />
      </div>
      <div id="faq">
        <FAQ locale={locale} content={faq} />
      </div>
      <FAQDecoration />
      <Footer locale={locale} content={footer} />
      <SidebarMenu />
    </main>
  );
}
