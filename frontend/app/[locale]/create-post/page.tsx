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
import { handlePublishNow, handleSaveDraft } from './store/actions';

const MAX_CHARS = 4096;

interface Channel {
  id: string;
  name: string;
  selected: boolean;
}

interface PostSettings {
  channels: Channel[];
  notifySubscribers: boolean;
  pinPost: boolean;
}

export default function CreatePostPage() {
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postSettings, setPostSettings] = useState<PostSettings>({
    channels: [],
    notifySubscribers: false,
    pinPost: false,
  });
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

  const onPublishNow = async () => {
    setIsPublishing(true);
    
    try {
      const result = await handlePublishNow(
        { text },
        postSettings
      );

      if (result.success) {
        alert(result.message);
        setText('');
      } else {
        alert(`Ошибка: ${result.message}`);
        if (result.errors) {
          console.error('Детали ошибок:', result.errors);
        }
      }
    } catch (error) {
      alert('Произошла ошибка при публикации');
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  const onSaveDraft = async () => {
    try {
      const result = await handleSaveDraft(
        { text },
        postSettings
      );

      if (result.success) {
        alert(result.message);
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Произошла ошибка при сохранении черновика');
      console.error(error);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.editor}>
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

        {showSettings && (
          <PostSettings 
            className={styles.settingsPanel}
            onSettingsChange={setPostSettings}
          />
        )}

        <div className={styles.content}>
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
            onClick={onSaveDraft}
          />
          <div className={styles.publishRow}>
            <Button
              text={isPublishing ? "Публикуем..." : "Опубликовать сейчас"}
              showArrow={false}
              className={styles.publishNowBtn}
              onClick={onPublishNow}
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
