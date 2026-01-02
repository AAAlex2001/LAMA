'use client';

import { useState } from 'react';
import { useTemplateContext } from '../store/template-context';
import Input from '@/components/input/input';
import Button from '@/components/button/button';
import styles from './blocks-section.module.scss';

export default function BlocksSection() {
  const { content, setContent, setMessage, uploadImage } = useTemplateContext();
  const [expanded, setExpanded] = useState(false);

  const blocks = Array.isArray(content.blocks) ? content.blocks : [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const addBlock = () => {
    setContent((p) => ({
      ...p,
      blocks: [
        ...(Array.isArray(p.blocks) ? p.blocks : []),
        { title: '', subtitle: '', description: '', advantages: [], image: undefined, imagePosition: 'right' as const },
      ],
    }));
  };

  const removeBlock = (blockIndex: number) => {
    setContent((p) => ({
      ...p,
      blocks: (Array.isArray(p.blocks) ? p.blocks : []).filter((_, i) => i !== blockIndex),
    }));
  };

  const updateBlockField = (
    blockIndex: number,
    field: 'title' | 'subtitle' | 'description' | 'imagePosition',
    value: string
  ) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex] || { title: '', subtitle: '', description: '', imagePosition: 'right' };
      newBlocks[blockIndex] = { ...current, [field]: value };
      return { ...p, blocks: newBlocks };
    });
  };

  const updateBlockImage = (blockIndex: number, url: string, alt: string) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const cleanUrl = String(url ?? '').trim();
      const cleanAlt = String(alt ?? '');
      const image = cleanUrl ? { url: cleanUrl, alt: cleanAlt } : undefined;
      newBlocks[blockIndex] = { ...current, image };
      return { ...p, blocks: newBlocks };
    });
  };

  const clearBlockImage = (blockIndex: number) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex];
      if (!current) return p;
      newBlocks[blockIndex] = { ...current, image: undefined };
      return { ...p, blocks: newBlocks };
    });
  };

  const addAdvantage = (blockIndex: number) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const advantages = Array.isArray(current.advantages) ? [...current.advantages] : [];
      advantages.push({ text: '' });
      newBlocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks: newBlocks };
    });
  };

  const updateAdvantage = (blockIndex: number, advIndex: number, text: string) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const advantages = Array.isArray(current.advantages) ? [...current.advantages] : [];
      while (advantages.length <= advIndex) advantages.push({ text: '' });
      advantages[advIndex] = { text };
      newBlocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks: newBlocks };
    });
  };

  const removeAdvantage = (blockIndex: number, advIndex: number) => {
    setContent((p) => {
      const newBlocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = newBlocks[blockIndex];
      if (!current) return p;
      const advantages = (Array.isArray(current.advantages) ? current.advantages : []).filter((_, i) => i !== advIndex);
      newBlocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks: newBlocks };
    });
  };

  const handleDropBlockImage = async (blockIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const currentAlt = String((content.blocks?.[blockIndex] as any)?.image?.alt ?? `Template block ${blockIndex + 1}`);
    updateBlockImage(blockIndex, url, currentAlt);
    setMessage('✅ Картинка загружена');
  };

  const handleSelectBlockImage = async (blockIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const currentAlt = String((content.blocks?.[blockIndex] as any)?.image?.alt ?? `Template block ${blockIndex + 1}`);
    updateBlockImage(blockIndex, url, currentAlt);
    setMessage('✅ Картинка загружена');
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>Blocks (контент ниже Hero)</div>
        <div className={styles.arrow}>{expanded ? '▼' : '▶'}</div>
      </div>

      {expanded && (
        <>
          <div className={styles.header}>
            <Button text="Добавить блок" onClick={addBlock} showArrow={false} size="small" />
          </div>

      {blocks.length === 0 ? <div className={styles.empty}>Пока нет блоков</div> : null}

      {blocks.map((block, blockIndex) => {
        const imageUrl = String(block?.image?.url ?? '');
        const imageAlt = String(block?.image?.alt ?? '');
        const advantages = Array.isArray(block?.advantages) ? block.advantages : [];

        return (
          <div key={blockIndex} className={styles.card}>
            <div className={styles.topRow}>
              <div className={styles.label}>Блок {blockIndex + 1}</div>
              <Button text="Удалить" onClick={() => removeBlock(blockIndex)} showArrow={false} size="small" />
            </div>

            <Input label="Title" value={String(block?.title ?? '')} onChange={(v) => updateBlockField(blockIndex, 'title', v)} />
            <Input label="Subtitle" value={String(block?.subtitle ?? '')} onChange={(v) => updateBlockField(blockIndex, 'subtitle', v)} />

            <div className={styles.textareaField}>
              <div className={styles.textareaLabel}>Description</div>
              <textarea
                className={styles.textarea}
                value={String(block?.description ?? '')}
                onChange={(e) => updateBlockField(blockIndex, 'description', e.target.value)}
                rows={4}
              />
              <div className={styles.formatHint}>Форматирование: ``слово`` — жирный, `слово` — градиент</div>
            </div>

            <div className={styles.textareaField}>
              <div className={styles.textareaLabel}>Позиция картинки</div>
              <select
                className={styles.select}
                value={block?.imagePosition ?? 'right'}
                onChange={(e) => updateBlockField(blockIndex, 'imagePosition', e.target.value)}
              >
                <option value="right">Справа</option>
                <option value="left">Слева</option>
              </select>
            </div>

            <div className={styles.imageSection}>
              <div className={styles.imagesTitle}>Картинка (опционально)</div>
              <div
                className={styles.imageCard}
                onDrop={(e) => handleDropBlockImage(blockIndex, e)}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSelectBlockImage(blockIndex, e)}
                  className={styles.fileInput}
                />
                {imageUrl ? (
                  <img src={imageUrl} alt={imageAlt || ''} />
                ) : (
                  <div className={styles.placeholder}>
                    <span>Перетащите или кликните</span>
                  </div>
                )}
              </div>
              <div className={styles.dropHint}>Перетащите или кликните</div>

              <Input label="Image URL" value={imageUrl} onChange={(v) => updateBlockImage(blockIndex, v, imageAlt)} />
              <Input label="Image ALT" value={imageAlt} onChange={(v) => updateBlockImage(blockIndex, imageUrl, v)} />

              {imageUrl ? (
                <Button text="Убрать картинку" onClick={() => clearBlockImage(blockIndex)} showArrow={false} size="small" />
              ) : null}
            </div>

            <div className={styles.advantagesSection}>
              <div className={styles.advantagesHeader}>
                <div className={styles.advantagesTitle}>Advantages (опционально)</div>
                <Button text="Добавить" onClick={() => addAdvantage(blockIndex)} showArrow={false} size="small" />
              </div>

              {advantages.length === 0 ? <div className={styles.advantagesEmpty}>Пока нет преимуществ</div> : null}

              <div className={styles.advantagesList}>
                {advantages.map((adv, advIndex) => (
                  <div key={advIndex} className={styles.advRow}>
                    <Input label={`Преимущество ${advIndex + 1}`} value={String(adv?.text ?? '')} onChange={(v) => updateAdvantage(blockIndex, advIndex, v)} />
                    <Button text="Удалить" onClick={() => removeAdvantage(blockIndex, advIndex)} showArrow={false} size="small" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}
