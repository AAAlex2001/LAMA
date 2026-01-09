'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
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
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.editor}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Новая публикация</span>
          <button
            className={styles.settingsButton}
            type="button"
            aria-label="Настройки"
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon width={24} height={24} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <PostSettings className={styles.settingsPanel} />
        )}

        {/* Content */}
        <div className={styles.content}>
          {/* Textarea */}
          <div className={styles.textareaWrapper}>
            <div className={styles.textareaInner}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Напишите текст публикации..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
              />
            </div>
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

          {/* Actions Menu */}
          <div className={styles.actionsMenu}>
            <div className={styles.actionsRow}>
              <Button
                text="Черновики"
                variant="templateCard"
                showArrow={false}
                icon={<DraftsIcon width={24} height={24} />}
                className={styles.actionButton}
              />
              <Button
                text="Кнопки"
                variant="templateCard"
                showArrow={false}
                icon={<InlineButtonIcon width={24} height={24} />}
                className={styles.actionButton}
              />
            </div>
            <div className={styles.actionsRow}>
              <Button
                text="Шаблоны"
                variant="templateCard"
                showArrow={false}
                icon={<TemplatesIcon width={24} height={24} />}
                className={styles.actionButton}
              />
              <Button
                text="Опрос"
                variant="templateCard"
                showArrow={false}
                icon={<QuizIcon width={24} height={24} />}
                className={styles.actionButton}
              />
            </div>
            <div className={styles.actionsRowCenter}>
              <Button
                text="Ответ на свой пост"
                variant="templateCard"
                showArrow={false}
                icon={<ReplyIcon width={24} height={24} />}
                className={styles.actionButtonCenter}
              />
            </div>
          </div>

          {/* Media Section */}
          <div className={styles.mediaSection}>
            <span className={styles.mediaSectionTitle}>Медиа и файлы</span>
            {/* Mobile: Button */}
            <div className={styles.mediaMobile}>
              <Button
                text="Прикрепить файл"
                variant="templateCard"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                fullWidth
              />
            </div>
            {/* Desktop: Drag and Drop */}
            <div className={styles.mediaDropzone}>
              <span className={styles.dropzoneText}>
                Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
              </span>
              <button className={styles.attachButton} type="button">
                <PaperclipIcon width={16} height={16} />
                <span>Прикрепить файл</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className={styles.footerButtons}>
          <Button
            text="Сохранить в черновики"
            showArrow={false}
            className={styles.saveDraftBtn}
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
