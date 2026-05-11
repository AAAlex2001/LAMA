export type HeroContent = {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  buttonUrl?: string;
  images: Array<{ url: string; alt: string }>;
  templateImages?: Array<{ url: string; alt: string }>;
};

export type TemplateBlockAdvantage = {
  text: string;
};

export type TemplateBlockContent = {
  title: string;
  subtitle: string;
  description: string;
  advantages?: TemplateBlockAdvantage[];
  image?: { url: string; alt: string };
  imagePosition?: 'left' | 'right';
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type FAQContent = {
  headline: string;
  faqItems: FAQItem[];
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  helpText?: string;
  botLink?: string;
};

export type SubscribePlacement = {
  position: 'after_block' | 'after_faq' | 'after_cards';
  afterBlockNumber?: number | null;
};

export type SubscribeBlockItem = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string | null;
  placement?: SubscribePlacement | null;
};

export type TemplatePageContent = {
  headline: string;
  lead: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  images?: Array<{ url: string; alt: string }>;
  blocks?: TemplateBlockContent[];
  faq?: FAQContent | null;
  cardsBlock?: {
    headline: string;
    cards: Array<{ title: string; text: string; buttonText: string; buttonLink?: string | null }>;
  } | null;
  subscribeBlocks?: SubscribeBlockItem[];
  subscribeBlock?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink?: string | null;
  } | null;
  subscribePlacement?: SubscribePlacement | null;
};

export type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

export type HeaderContent = {
  brandPrefix: string;
  brandSuffix: string;
  toolsLabel: string;
  toolsOrder?: number;
  loginText: string;
  loginHref: string;
  registerText: string;
  registerHref: string;
  telegramText: string;
  telegramHref: string;
  navLinks: Array<{ text: string; href: string; order?: number }>;
};

export type ToolsContent = {
  items: Array<{ title: string; description?: string | null; href: string; order?: number }>;
};

export type TemplateItem = {
  id: number;
  slug: string;
};
