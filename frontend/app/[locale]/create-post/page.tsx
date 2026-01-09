'use client';

import { useState } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  AiEditIcon,
  EmojiIcon,
  PaperclipIcon,
} from '@/components/icons';

const MAX_CHARS = 4096;

export default function CreatePostPage() {
  const [text, setText] = useState('');

  const charCount = text.length;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.editor}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Новая публикация</span>
          <button className={styles.settingsButton} type="button" aria-label="Настройки">
            <SettingsIcon width={24} height={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Textarea */}
          <div className={styles.textareaWrapper}>
            <div className={styles.textareaInner}>
              <textarea
                className={styles.textarea}
                placeholder="Напишите текст публикации..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
              />
              <div className={styles.textareaFooter}>
                <div className={styles.textareaTools}>
                  <button className={styles.toolButton} type="button" aria-label="AI редактирование">
                    <AiEditIcon width={21} height={21} />
                  </button>
                  <button className={styles.toolButton} type="button" aria-label="Эмодзи">
                    <EmojiIcon width={21} height={21} />
                  </button>
                </div>
                <div className={styles.charCountWrapper}>
                  <button className={styles.toolButton} type="button" aria-label="Подсчет символов">
                    <TemplatesIcon width={21} height={21} />
                  </button>
                  <span className={styles.charCount}>{charCount}/{MAX_CHARS}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className={styles.actionsMenu}>
            <div className={styles.actionsRow}>
              <Button
                text="Черновики"
                variant="templateCard"
                showArrow={false}
                icon={<DraftsIcon width={24} height={24} />}
                className={styles.actionButtonHalf}
              />
              <Button
                text="Кнопки"
                variant="templateCard"
                showArrow={false}
                icon={<InlineButtonIcon width={24} height={24} />}
                className={styles.actionButtonHalf}
              />
            </div>
            <div className={styles.actionsRow}>
              <Button
                text="Шаблоны"
                variant="templateCard"
                showArrow={false}
                icon={<TemplatesIcon width={24} height={24} />}
                className={styles.actionButtonHalf}
              />
              <Button
                text="Опрос"
                variant="templateCard"
                showArrow={false}
                icon={<QuizIcon width={24} height={24} />}
                className={styles.actionButtonHalf}
              />
            </div>
            <Button
              text="Ответ на свой пост"
              variant="templateCard"
              showArrow={false}
              icon={<ReplyIcon width={24} height={24} />}
              fullWidth
            />
          </div>

          {/* Media Section */}
          <div className={styles.mediaSection}>
            <span className={styles.mediaSectionTitle}>Медиа и файлы</span>
            <Button
              text="Прикрепить файл"
              variant="templateCard"
              showArrow={false}
              icon={<PaperclipIcon width={24} height={24} />}
              fullWidth
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className={styles.footerButtons}>
          <Button
            text="Сохранить в черновики"
            showArrow={false}
            fullWidth
          />
          <div className={styles.publishRow}>
            <Button
              text="Опубликовать сейчас"
              showArrow={false}
              className={styles.publishNowBtn}
            />
            <Button
              text="Запланировать"
              showArrow={false}
              active
              className={styles.scheduleBtn}
            />
          </div>
        </div>
      </div>

      {/* Add Series Button (outside editor) */}
      <Button
        text="Добавить серию постов"
        showArrow={false}
      />
    </div>
  );
}
