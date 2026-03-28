'use client';

import { FC, useRef, useState } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Checkbox } from '@/components/checkbox';
import { Button } from '@/components/new-button';
import {
  PlusIcon,
  TrashIcon,
  AiEditIcon,
  EyeIcon,
  ChevronDownIcon,
  InlineButtonIcon,
  PaperclipIcon,
} from '@/components/icons';
import MediaPreview from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';
import { useAutoReplyDispatch, useAutoReplySelector } from './store';
import {
  close,
  addKeywords,
  removeKeyword,
  setResponseText,
  setScope,
  setIsActive,
  setIsSubmitting,
  setFrequencyLimitEnabled,
  setFrequencyLimitType,
  setFrequencyLimitMinutes,
} from './store/slices/form';
import { createAutoReplyThunk, updateAutoReplyThunk } from './store/thunks';
import styles from './CreateAutoReplyModal.module.scss';

interface CreateAutoReplyModalProps {
  botId: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1 мин' },
  { value: 5, label: '5 мин' },
  { value: 15, label: '15 мин' },
  { value: 30, label: '30 мин' },
  { value: 60, label: '1 час' },
];

const MAX_RESPONSE_LENGTH = 1024;

const SHORTCODES = [
  { code: '{user.username}', label: '{username}' },
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{user.last_name}', label: '{lastname}' },
  { code: '{user.id}', label: '{user_id}' },
  { code: '{bot.first_name}', label: '{bot_name}' },
  { code: '{chat.title}', label: '{chat_title}' },
  { code: '{date}', label: '{date}' },
  { code: '{time}', label: '{time}' },
];

const PREVIEW_REPLACEMENTS: Record<string, string> = {
  '{user.username}': '@username',
  '{user.first_name}': 'Иван',
  '{user.last_name}': 'Иванов',
  '{user.id}': '123456',
  '{bot.first_name}': 'MyBot',
  '{chat.title}': 'Название чата',
  '{date}': '28.03.2026',
  '{time}': '12:00',
};

function renderPreview(text: string): string {
  return Object.entries(PREVIEW_REPLACEMENTS).reduce(
    (t, [key, val]) => t.replaceAll(key, val),
    text,
  );
}

const CreateAutoReplyModal: FC<CreateAutoReplyModalProps> = ({ botId, isOpen: externalOpen, onOpenChange }) => {
  const dispatch = useAutoReplyDispatch();
  const { showSuccess, showError } = useNotifications();
  const form = useAutoReplySelector((s) => s.form);
  const isModalOpen = externalOpen !== undefined ? externalOpen : form.isOpen;

  const [newKeyword, setNewKeyword] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTooltipVisible, setAiTooltipVisible] = useState(false);
  // Synonyms are never cleared on new search — user dismisses manually
  const [synonymSuggestions, setSynonymSuggestions] = useState<string[]>([]);
  const [synonymsForWord, setSynonymsForWord] = useState('');
  const [frequencyPickerOpen, setFrequencyPickerOpen] = useState(false);
  const [inlineButtonsOpen, setInlineButtonsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    mediaFiles,
    isUploadingMedia,
    fileInputRef,
    handleFileUpload,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const {
    rows: inlineButtonRows,
    addRow: addInlineButtonRow,
    addColumn: addInlineButtonColumn,
    updateButton: updateInlineButton,
    deleteButton: deleteInlineButton,
    reset: resetInlineButtons,
  } = useInlineButtons();

  const MAX_MEDIA = 10;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  const isEditing = form.editingId !== null;
  const validKeywordIndices = form.keywords
    .map((kw, i) => ({ kw, i }))
    .filter(({ kw }) => kw.trim())
    .map(({ i }) => i);

  const half = Math.ceil(validKeywordIndices.length / 2);
  const leftIndices = validKeywordIndices.slice(0, half);
  const rightIndices = validKeywordIndices.slice(half);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || form.keywords.includes(trimmed)) return;
    dispatch(addKeywords([trimmed]));
    setNewKeyword('');
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleAiSynonyms = async () => {
    const word = newKeyword.trim();
    if (!word) return;
    setAiLoading(true);
    // Do NOT clear previous synonyms — update after new ones arrive
    setSynonymsForWord(word);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lamaplanner_access_token') || '' : '';
      const response = await fetch(`${API_BASE_URL}/publications/ai/edit-text-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: word,
          instruction: `Найди 6-8 синонимов для слова "${word}". Верни ТОЛЬКО слова через запятую. Без нумерации, без пояснений, без самого слова "${word}", без лишних символов.`,
        }),
      });

      if (!response.ok) throw new Error('AI error');

      const reader = response.body?.getReader();
      if (!reader) return;

      let raw = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      // Strip SSE "data: " prefixes line by line
      const text = raw
        .split('\n')
        .map((line) => (line.startsWith('data: ') ? line.slice(6) : line))
        .join('')
        .replace(/\[DONE\]/g, '')
        .trim();

      const words = text
        .split(/[,;\n]+/)
        .map((w) =>
          w
            .trim()
            .replace(/^\d+[\.)]\s*/, '')
            .replace(/[«»"'*_]/g, '')
            .trim(),
        )
        .filter((w) => w.length > 0 && w.length < 40 && w.toLowerCase() !== word.toLowerCase());

      if (words.length > 0) {
        setSynonymSuggestions(words.slice(0, 10));
      }
    } catch {
      showError('Не удалось получить синонимы');
    } finally {
      setAiLoading(false);
    }
  };

  const handleInsertShortcode = (code: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = form.responseText.substring(0, start) + code + form.responseText.substring(end);
      if (newText.length <= MAX_RESPONSE_LENGTH) {
        dispatch(setResponseText(newText));
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
      }
    } else {
      const newText = form.responseText + code;
      if (newText.length <= MAX_RESPONSE_LENGTH) dispatch(setResponseText(newText));
    }
  };

  const handleClose = () => {
    dispatch(close());
    onOpenChange?.(false);
    handleClearMedia();
    resetInlineButtons();
    setSynonymSuggestions([]);
    setPreviewOpen(false);
  };

  const handleSubmit = async () => {
    if (validKeywordIndices.length === 0 || !form.responseText.trim()) return;

    // Show loader immediately
    dispatch(setIsSubmitting(true));

    const baseUrl = API_BASE_URL.replace('/api', '');
    const mediaUrls: string[] = [];

    try {
      for (const mediaFile of limitedMediaFiles) {
        if (mediaFile.url) {
          mediaUrls.push(mediaFile.url);
        } else if (mediaFile.file) {
          const uploaded = await uploadMediaFile(mediaFile.file);
          const url = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
          mediaUrls.push(url);
        }
      }

      const data = {
        keywords: validKeywordIndices.map((i) => form.keywords[i]),
        response_text: form.responseText.trim(),
        response_media_url: mediaUrls[0] || undefined,
        response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        response_buttons: buildInlineKeyboard(inlineButtonRows),
        scope: form.scope,
        is_active: form.isActive,
        frequency_limit_minutes: form.frequencyLimitEnabled ? form.frequencyLimitMinutes : undefined,
        frequency_limit_type: form.frequencyLimitEnabled ? form.frequencyLimitType : undefined,
      };

      if (isEditing) {
        await dispatch(updateAutoReplyThunk({ botId, replyId: form.editingId!, data })).unwrap();
        showSuccess('Автоответ обновлён');
      } else {
        await dispatch(createAutoReplyThunk({ botId, data })).unwrap();
        showSuccess('Автоответ создан');
      }
      handleClearMedia();
      resetInlineButtons();
    } catch {
      showError(isEditing ? 'Ошибка обновления' : 'Ошибка создания');
      dispatch(setIsSubmitting(false));
    }
  };

  const isSubmitDisabled = validKeywordIndices.length === 0 || !form.responseText.trim() || form.isSubmitting;
  const frequencyLabel = FREQUENCY_OPTIONS.find((o) => o.value === form.frequencyLimitMinutes)?.label ?? `${form.frequencyLimitMinutes} мин`;

  const renderKeywordColumn = (indices: number[]) => (
    <div className={styles.keywordsColumn}>
      {indices.map((idx) => (
        <div key={idx} className={styles.keywordRow}>
          <div className={styles.keywordDot} />
          <span className={styles.keywordText}>{form.keywords[idx]}</span>
          <button type="button" className={styles.keywordDeleteBtn} onClick={() => dispatch(removeKeyword(idx))}>
            <TrashIcon width={15} height={15} color="currentColor" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ModalBase isOpen={isModalOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <ModalBase.Content size="xl" className={styles.modal}>
        <ModalBase.Header className={styles.header}>
          <ModalBase.Title className={styles.title}>
            {isEditing ? 'Редактировать автоответ' : 'Создание автоответа'}
          </ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.body}>
          <div className={styles.desktopLayout}>
            {/* LEFT COLUMN */}
            <div className={styles.leftColumn}>
              {/* Trigger phrases */}
              <div>
                <span className={styles.sectionLabel}>Триггер-фразы</span>
                <div className={styles.keywordInputWrapper}>
                  <div className={styles.keywordInputRow}>
                    <Input
                      className={styles.keywordInput}
                      placeholder="Введите слово или фразу"
                      value={newKeyword}
                      onChange={setNewKeyword}
                      onKeyDown={handleKeywordKeyDown}
                      icons={[
                        {
                          icon: <AiEditIcon width={21} height={21} color={aiLoading ? '#3B82F6' : '#383F45'} />,
                          onClick: handleAiSynonyms,
                          onMouseEnter: () => setAiTooltipVisible(true),
                          onMouseLeave: () => setAiTooltipVisible(false),
                          disabled: aiLoading || !newKeyword.trim(),
                        },
                      ]}
                    />
                    <button
                      type="button"
                      className={styles.addKeywordBtn}
                      onClick={handleAddKeyword}
                      disabled={!newKeyword.trim()}
                    >
                      <PlusIcon width={16} height={16} color="#3B82F6" />
                    </button>
                  </div>

                  {aiTooltipVisible && (
                    <div className={styles.aiTooltip}>Найти список синонимов</div>
                  )}
                </div>

                {validKeywordIndices.length > 0 && (
                  <div className={styles.keywordsColumns}>
                    {renderKeywordColumn(leftIndices)}
                    {rightIndices.length > 0 && renderKeywordColumn(rightIndices)}
                  </div>
                )}

                {synonymSuggestions.length > 0 && (
                  <div className={styles.synonymPanel}>
                    <div className={styles.synonymPanelHeader}>
                      <span className={styles.synonymLabel}>
                        {aiLoading ? `Ищу синонимы для «${synonymsForWord}»...` : `Синонимы для «${synonymsForWord}»`}
                      </span>
                      <button type="button" className={styles.synonymDismiss} onClick={() => setSynonymSuggestions([])}>
                        ✕
                      </button>
                    </div>
                    <div className={styles.synonymChips}>
                      {synonymSuggestions.map((w, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`${styles.synonymChip} ${form.keywords.includes(w) ? styles.synonymChipAdded : ''}`}
                          onClick={() => { if (!form.keywords.includes(w)) dispatch(addKeywords([w])); }}
                          disabled={form.keywords.includes(w)}
                        >
                          {form.keywords.includes(w) ? '✓ ' : '+ '}{w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Frequency */}
              <div className={styles.frequencySection}>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Ограничить частоту ответа</span>
                  <Toggle checked={form.frequencyLimitEnabled} onChange={(v) => dispatch(setFrequencyLimitEnabled(v))} />
                </div>

                {form.frequencyLimitEnabled && (
                  <>
                    <div className={styles.pickerRow}>
                      <span className={styles.pickerLabel}>Не чаще чем:</span>
                      <div className={styles.pickerRight} onClick={() => setFrequencyPickerOpen(!frequencyPickerOpen)}>
                        <span className={styles.pickerValueText}>{frequencyLabel}</span>
                        <div className={`${styles.pickerChevron} ${frequencyPickerOpen ? styles.pickerChevronOpen : ''}`}>
                          <ChevronDownIcon width={14} height={14} color="#858585" />
                        </div>
                      </div>
                      {frequencyPickerOpen && (
                        <div className={styles.pickerDropdown}>
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`${styles.pickerOption} ${form.frequencyLimitMinutes === opt.value ? styles.pickerOptionActive : ''}`}
                              onClick={() => { dispatch(setFrequencyLimitMinutes(opt.value)); setFrequencyPickerOpen(false); }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.radioGroup}>
                      <div className={styles.radioRow} onClick={() => dispatch(setFrequencyLimitType('per_user'))}>
                        <Checkbox variant="radio" checked={form.frequencyLimitType === 'per_user'} onChange={() => dispatch(setFrequencyLimitType('per_user'))} />
                        <span className={styles.radioLabel}>Для одного пользователя</span>
                      </div>
                      <div className={styles.radioRow} onClick={() => dispatch(setFrequencyLimitType('per_group'))}>
                        <Checkbox variant="radio" checked={form.frequencyLimitType === 'per_group'} onChange={() => dispatch(setFrequencyLimitType('per_group'))} />
                        <span className={styles.radioLabel}>Для всей группы</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Scope — under frequency in left column */}
              <div className={styles.scopeSection}>
                <span className={styles.sectionLabel}>Область действия</span>
                <div className={styles.radioGroup}>
                  <div className={styles.radioRow} onClick={() => dispatch(setScope('GROUPS'))}>
                    <Checkbox variant="radio" checked={form.scope === 'GROUPS'} onChange={() => dispatch(setScope('GROUPS'))} />
                    <span className={styles.radioLabel}>Публичные чаты</span>
                  </div>
                  <div className={styles.radioRow} onClick={() => dispatch(setScope('PRIVATE'))}>
                    <Checkbox variant="radio" checked={form.scope === 'PRIVATE'} onChange={() => dispatch(setScope('PRIVATE'))} />
                    <span className={styles.radioLabel}>Приватные чаты</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.rightColumn}>
              {/* Response text */}
              <div className={styles.responseSection}>
                <div className={styles.responseLabelRow}>
                  <span className={styles.responseLabel}>Текст ответа</span>
                  <button
                    type="button"
                    className={`${styles.previewBtn} ${previewOpen ? styles.previewBtnActive : ''}`}
                    title="Предпросмотр"
                    onClick={() => setPreviewOpen(!previewOpen)}
                  >
                    <EyeIcon width={16} height={16} color="currentColor" />
                  </button>
                </div>

                <div className={styles.textareaWrapper}>
                  <textarea
                    ref={textareaRef}
                    className={styles.textarea}
                    placeholder="Введите текст ответа"
                    value={form.responseText}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_RESPONSE_LENGTH) dispatch(setResponseText(e.target.value));
                    }}
                  />
                  <div className={styles.charCounter}>{form.responseText.length}/{MAX_RESPONSE_LENGTH}</div>
                </div>

                {previewOpen && (
                  <div className={styles.previewPanel}>
                    <span className={styles.previewLabel}>Предпросмотр:</span>
                    <div className={styles.previewBubble}>
                      {renderPreview(form.responseText) || <span className={styles.previewEmpty}>Введите текст ответа...</span>}
                    </div>
                  </div>
                )}

                <div className={styles.shortcodesRow}>
                  <span className={styles.shortcodesLabelInline}>Доступные шорткоды:</span>
                  <div className={styles.shortcodeChips}>
                    {SHORTCODES.map((sc) => (
                      <button key={sc.code} type="button" className={styles.shortcodeChip} onClick={() => handleInsertShortcode(sc.code)}>
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inline buttons */}
              <div>
                <button
                  type="button"
                  className={`${styles.inlineButtonsRow} ${inlineButtonsOpen ? styles.inlineButtonsRowActive : ''}`}
                  onClick={() => setInlineButtonsOpen(!inlineButtonsOpen)}
                >
                  <InlineButtonIcon width={24} height={24} color="#383F45" />
                  <span className={styles.inlineButtonsLabel}>Кнопки</span>
                </button>
                {inlineButtonsOpen && (
                  <div className={styles.inlineButtonsContent}>
                    <InlineButtons
                      isOpen={inlineButtonsOpen}
                      rows={inlineButtonRows}
                      onAddRow={addInlineButtonRow}
                      onAddColumn={addInlineButtonColumn}
                      onUpdateButton={updateInlineButton}
                      onDeleteButton={deleteInlineButton}
                      hideButtonType
                    />
                  </div>
                )}
              </div>

              {/* Media — inside the dropzone frame */}
              <div className={styles.mediaSection}>
                <span className={styles.mediaLabel}>Медиа и файлы</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div
                  className={styles.mediaDropzone}
                  onClick={() => canAddMedia && fileInputRef.current?.click()}
                >
                  {limitedMediaFiles.length > 0 ? (
                    <div className={styles.mediaInFrame} onClick={(e) => e.stopPropagation()}>
                      <MediaPreview
                        files={limitedMediaFiles}
                        onRemove={handleRemoveFile}
                        onToggleBlur={handleToggleBlur}
                        onMove={handleMoveMedia}
                      />
                      {canAddMedia && (
                        <button
                          type="button"
                          className={styles.mediaAttachBtn}
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          disabled={isUploadingMedia}
                        >
                          <PaperclipIcon width={16} height={16} color="#383F45" />
                          {isUploadingMedia ? 'Загрузка...' : 'Прикрепить ещё'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className={styles.mediaDropzoneText}>
                        Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
                      </span>
                      <button
                        type="button"
                        className={styles.mediaAttachBtn}
                        onClick={(e) => { e.stopPropagation(); if (canAddMedia) fileInputRef.current?.click(); }}
                        disabled={!canAddMedia || isUploadingMedia}
                      >
                        <PaperclipIcon width={16} height={16} color="#383F45" />
                        {isUploadingMedia ? 'Загрузка...' : 'Прикрепить файл'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active toggle — right-aligned above footer */}
          <div className={styles.activeRow}>
            <span className={styles.toggleLabel}>Активен</span>
            <Toggle checked={form.isActive} onChange={(v) => dispatch(setIsActive(v))} />
          </div>

          <div className={styles.footer}>
            <Button variant="outline" intent="gradient" size="lg" className={styles.cancelBtn} onClick={handleClose}>
              Отменить
            </Button>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              loading={form.isSubmitting}
            >
              Сохранить
            </Button>
          </div>
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateAutoReplyModal;
