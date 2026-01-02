'use client';

import Button from '@/components/button/button';
import styles from './template-subscribe.module.scss';

type Props = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string | null;
};

export default function TemplateSubscribe({ title, subtitle, buttonText, buttonLink }: Props) {
  const safeTitle = String(title ?? '').trim();
  const safeSubtitle = String(subtitle ?? '').trim();
  const safeButtonText = String(buttonText ?? '').trim();
  const safeButtonLink = String(buttonLink ?? '').trim();

  if (!safeTitle && !safeSubtitle && !safeButtonText && !safeButtonLink) return null;

  return (
    <section className={styles.section}>
      <div className={styles.subscribe}>
        <div className={styles.info}>
          <div className={styles.headings}>
            {safeTitle ? (
                <h1 className={styles.title}>{safeTitle}</h1>
            ) : null}

            {safeSubtitle ? (
                <h2 className={styles.subtitle}>{safeSubtitle}</h2>
            ) : null}
          </div>

          {safeButtonText ? (
            <div className={styles.buttonWrap}>
              <Button
                text={safeButtonText}
                href={safeButtonLink || undefined}
                showArrow={false}
                active
                className={styles.buttonOverride}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
