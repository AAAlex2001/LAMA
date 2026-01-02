'use client';

import { useState } from 'react';
import { useTemplateContext } from '../store/template-context';
import Input from '@/components/input/input';
import Button from '@/components/button/button';
import styles from './subscribe-section.module.scss';

export default function SubscribeSection() {
  const { content, setContent } = useTemplateContext();
  const [expanded, setExpanded] = useState(false);

  const subscribeBlocks = Array.isArray(content.subscribeBlocks) ? content.subscribeBlocks : [];

  const addBlock = () => {
    setContent((p) => ({
      ...p,
      subscribeBlocks: [
        ...(Array.isArray(p.subscribeBlocks) ? p.subscribeBlocks : []),
        {
          title: '',
          subtitle: '',
          buttonText: '',
          buttonLink: '',
          placement: { position: 'after_cards' as const, afterBlockNumber: null },
        },
      ],
    }));
  };

  const removeBlock = (index: number) => {
    setContent((p) => ({
      ...p,
      subscribeBlocks: (Array.isArray(p.subscribeBlocks) ? p.subscribeBlocks : []).filter((_, i) => i !== index),
    }));
  };

  const updateBlock = (index: number, field: 'title' | 'subtitle' | 'buttonText' | 'buttonLink', value: string) => {
    setContent((p) => {
      const blocks = Array.isArray(p.subscribeBlocks) ? [...p.subscribeBlocks] : [];
      if (blocks[index]) {
        blocks[index] = { ...blocks[index], [field]: value };
      }
      return { ...p, subscribeBlocks: blocks };
    });
  };

  const updatePlacement = (
    index: number,
    position: 'after_block' | 'after_faq' | 'after_cards',
    afterBlockNumber?: number | null
  ) => {
    setContent((p) => {
      const blocks = Array.isArray(p.subscribeBlocks) ? [...p.subscribeBlocks] : [];
      if (blocks[index]) {
        blocks[index] = {
          ...blocks[index],
          placement: { position, afterBlockNumber: afterBlockNumber ?? null },
        };
      }
      return { ...p, subscribeBlocks: blocks };
    });
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>Subscribe блоки</div>
        <div className={styles.arrow}>{expanded ? '▼' : '▶'}</div>
      </div>

      {expanded && (
        <>
          <div className={styles.header}>
            <Button text="Добавить блок" onClick={addBlock} showArrow={false} size="small" />
          </div>

          {subscribeBlocks.length === 0 ? <div className={styles.empty}>Пока нет блоков</div> : null}

          {subscribeBlocks.map((block, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.topRow}>
                <div className={styles.label}>Subscribe блок {index + 1}</div>
                <Button text="Удалить" onClick={() => removeBlock(index)} showArrow={false} size="small" />
              </div>

              <Input
                label="Title"
                value={String(block.title ?? '')}
                onChange={(v) => updateBlock(index, 'title', v)}
              />

              <Input
                label="Subtitle"
                value={String(block.subtitle ?? '')}
                onChange={(v) => updateBlock(index, 'subtitle', v)}
              />

              <Input
                label="Button text"
                value={String(block.buttonText ?? '')}
                onChange={(v) => updateBlock(index, 'buttonText', v)}
              />

              <Input
                label="Button link"
                value={String(block.buttonLink ?? '')}
                onChange={(v) => updateBlock(index, 'buttonLink', v)}
              />

              <div className={styles.textareaField}>
                <div className={styles.textareaLabel}>Placement</div>
                <select
                  className={styles.select}
                  value={block.placement?.position ?? 'after_cards'}
                  onChange={(e) => {
                    const pos = e.target.value as 'after_block' | 'after_faq' | 'after_cards';
                    updatePlacement(index, pos, block.placement?.afterBlockNumber);
                  }}
                >
                  <option value="after_cards">После карточек</option>
                  <option value="after_faq">После FAQ</option>
                  <option value="after_block">После блока #N</option>
                </select>
              </div>

              {(block.placement?.position ?? 'after_cards') === 'after_block' ? (
                <Input
                  label="After block number (1-based)"
                  value={String(block.placement?.afterBlockNumber ?? '')}
                  onChange={(v) => {
                    const parsed = Number(String(v ?? '').replace(/[^0-9]/g, ''));
                    const num = Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
                    updatePlacement(index, 'after_block', num);
                  }}
                />
              ) : null}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
