'use client';

import { useState } from 'react';
import { useTemplateContext } from '../store/template-context';
import Input from '@/components/input/input';
import styles from './hero-section.module.scss';

export default function HeroSection() {
  const { content, setContent, setMessage, uploadImage } = useTemplateContext();
  const [expanded, setExpanded] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropImage = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const newImages = Array.isArray(content.images) ? [...content.images] : [];
    while (newImages.length < 5) newImages.push({ url: '', alt: '' });
    newImages[index] = { url, alt: `Template hero ${index + 1}` };
    setContent((p) => ({ ...p, images: newImages }));
    setMessage('✅ Картинка загружена');
  };

  const handleSelectImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const newImages = Array.isArray(content.images) ? [...content.images] : [];
    while (newImages.length < 5) newImages.push({ url: '', alt: '' });
    newImages[index] = { url, alt: `Template hero ${index + 1}` };
    setContent((p) => ({ ...p, images: newImages }));
    setMessage('✅ Картинка загружена');
  };

  return (
    <div className={styles.section}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.title}>Hero</div>
        <div className={styles.arrow}>{expanded ? '▼' : '▶'}</div>
      </div>

      {expanded && (
        <>
          <Input
        label="Hero: заголовок"
        value={content.headline}
        onChange={(v) => setContent((p) => ({ ...p, headline: v }))}
      />
      <Input
        label="Hero: paragraph"
        value={content.lead}
        onChange={(v) => setContent((p) => ({ ...p, lead: v }))}
      />
      <Input
        label="Hero: buttonText"
        value={String(content.ctaText ?? '')}
        onChange={(v) => setContent((p) => ({ ...p, ctaText: v }))}
      />

      <div className={styles.imagesSection}>
        <div className={styles.imagesTitle}>Hero: картинки (для этого шаблона)</div>
        <div className={styles.imagesGrid}>
          {(Array.isArray(content.images) ? content.images : []).map((image, index) => (
            <div key={index} className={styles.imageCard}>
              <div
                className={styles.imagePreview}
                onDrop={(e) => handleDropImage(index, e)}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSelectImage(index, e)}
                  className={styles.fileInput}
                />
                {image?.url ? (
                  <img src={image.url} alt={image.alt || ''} />
                ) : (
                  <div className={styles.placeholder}>
                    <span>Картинка {index + 1}</span>
                  </div>
                )}
              </div>
              <div className={styles.dropHint}>Перетащите или кликните</div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
