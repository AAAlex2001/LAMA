'use client';

import { useState } from 'react';
import { useTemplateContext } from '../store/template-context';
import Input from '@/components/input/input';
import { Button } from '@/components/new-button';
import styles from './faq-section.module.scss';

export default function FAQSection() {
  const { content, setContent } = useTemplateContext();
  const [expanded, setExpanded] = useState(false);

  const faqItems = Array.isArray(content.faq?.faqItems) ? content.faq!.faqItems : [];

  const addFAQItem = () => {
    setContent((p) => {
      const current = p.faq ?? { headline: '', faqItems: [] };
      const items = Array.isArray(current.faqItems) ? [...current.faqItems] : [];
      items.push({ question: '', answer: '' });
      return { ...p, faq: { ...current, faqItems: items } };
    });
  };

  const removeFAQItem = (index: number) => {
    setContent((p) => {
      const current = p.faq ?? { headline: '', faqItems: [] };
      const items = (Array.isArray(current.faqItems) ? current.faqItems : []).filter((_, i) => i !== index);
      return { ...p, faq: { ...current, faqItems: items } };
    });
  };

  const updateFAQItem = (index: number, field: 'question' | 'answer', value: string) => {
    setContent((p) => {
      const current = p.faq ?? { headline: '', faqItems: [] };
      const items = Array.isArray(current.faqItems) ? [...current.faqItems] : [];
      while (items.length <= index) items.push({ question: '', answer: '' });
      items[index] = { ...items[index], [field]: value };
      return { ...p, faq: { ...current, faqItems: items } };
    });
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>FAQ (для этого шаблона)</div>
        <div className={styles.arrow}>{expanded ? '▼' : '▶'}</div>
      </div>

      {expanded && (
        <>
          <div className={styles.header}>
            <Button onClick={addFAQItem} size="sm">Добавить вопрос</Button>
          </div>

      <Input
        label="FAQ: заголовок"
        value={String(content.faq?.headline ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), headline: v } }))}
      />

      {faqItems.length === 0 ? <div className={styles.empty}>Пока нет вопросов</div> : null}

      {faqItems.map((item, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.topRow}>
            <div className={styles.label}>Вопрос {index + 1}</div>
            <Button onClick={() => removeFAQItem(index)} size="sm">Удалить</Button>
          </div>

          <Input label="Question" value={String(item?.question ?? '')} onChange={(v) => updateFAQItem(index, 'question', v)} />

          <div className={styles.textareaField}>
            <div className={styles.textareaLabel}>Answer</div>
            <textarea
              className={styles.textarea}
              value={String(item?.answer ?? '')}
              onChange={(e) => updateFAQItem(index, 'answer', e.target.value)}
              rows={4}
            />
            <div className={styles.formatHint}>Форматирование: ``слово`` — жирный, `слово` — градиент</div>
          </div>
        </div>
      ))}

      <Input
        label="FAQ: Primary button text"
        value={String(content.faq?.primaryButtonText ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), primaryButtonText: v } }))}
      />
      <Input
        label="FAQ: Primary button link"
        value={String(content.faq?.primaryButtonLink ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), primaryButtonLink: v } }))}
      />

      <Input
        label="FAQ: Secondary button text"
        value={String(content.faq?.secondaryButtonText ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), secondaryButtonText: v } }))}
      />
      <Input
        label="FAQ: Secondary button link"
        value={String(content.faq?.secondaryButtonLink ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), secondaryButtonLink: v } }))}
      />

      <Input
        label="FAQ: Help text"
        value={String(content.faq?.helpText ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), helpText: v } }))}
      />
      <Input
        label="FAQ: Bot link"
        value={String(content.faq?.botLink ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, faq: { ...(p.faq ?? { headline: '', faqItems: [] }), botLink: v } }))}
      />
        </>
      )}
    </div>
  );
}
