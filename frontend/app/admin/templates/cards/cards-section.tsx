'use client';

import { useState } from 'react';
import { useTemplateContext } from '../store/template-context';
import Input from '@/components/input/input';
import Button from '@/components/button/button';
import styles from './cards-section.module.scss';
import type { TemplateCardItem } from '../types';

export default function CardsSection() {
  const { content, setContent } = useTemplateContext();
  const [expanded, setExpanded] = useState(false);

  const cards = Array.isArray(content.cardsBlock?.cards) ? content.cardsBlock!.cards : [];

  const addCard = () => {
    setContent((p) => {
      const current = p.cardsBlock ?? { headline: '', cards: [] };
      const newCards = Array.isArray(current.cards) ? [...current.cards] : [];
      newCards.push({ title: '', text: '', buttonText: '', buttonLink: '' });
      return { ...p, cardsBlock: { ...current, cards: newCards } };
    });
  };

  const removeCard = (index: number) => {
    setContent((p) => {
      const current = p.cardsBlock ?? { headline: '', cards: [] };
      const newCards = (Array.isArray(current.cards) ? current.cards : []).filter((_, i) => i !== index);
      return { ...p, cardsBlock: { ...current, cards: newCards } };
    });
  };

  const updateCard = (index: number, field: keyof TemplateCardItem, value: string) => {
    setContent((p) => {
      const current = p.cardsBlock ?? { headline: '', cards: [] };
      const newCards = Array.isArray(current.cards) ? [...current.cards] : [];
      while (newCards.length <= index) newCards.push({ title: '', text: '', buttonText: '', buttonLink: '' });
      newCards[index] = { ...newCards[index], [field]: value };
      return { ...p, cardsBlock: { ...current, cards: newCards } };
    });
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>Карточки (скролл)</div>
        <div className={styles.arrow}>{expanded ? '▼' : '▶'}</div>
      </div>

      {expanded && (
        <>
          <div className={styles.header}>
            <Button text="Добавить карточку" onClick={addCard} showArrow={false} size="small" />
          </div>

      <Input
        label="Заголовок блока"
        value={String(content.cardsBlock?.headline ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, cardsBlock: { ...(p.cardsBlock ?? { cards: [] }), headline: v } }))}
      />

      {cards.length === 0 ? <div className={styles.empty}>Пока нет карточек</div> : null}

      {cards.map((card, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.topRow}>
            <div className={styles.label}>Карточка {index + 1}</div>
            <Button text="Удалить" onClick={() => removeCard(index)} showArrow={false} size="small" />
          </div>

          <Input label="Title" value={String(card?.title ?? '')} onChange={(v) => updateCard(index, 'title', v)} />

          <div className={styles.textareaField}>
            <div className={styles.textareaLabel}>Text</div>
            <textarea
              className={styles.textarea}
              value={String(card?.text ?? '')}
              onChange={(e) => updateCard(index, 'text', e.target.value)}
              rows={3}
            />
          </div>

          <Input label="Button text" value={String(card?.buttonText ?? '')} onChange={(v) => updateCard(index, 'buttonText', v)} />
          <Input label="Button link" value={String(card?.buttonLink ?? '')} onChange={(v) => updateCard(index, 'buttonLink', v)} />
        </div>
      ))}
        </>
      )}
    </div>
  );
}
