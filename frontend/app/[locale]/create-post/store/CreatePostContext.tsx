'use client';

import React, { createContext, useContext, useState, useRef, type ReactNode } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';

// Импортируем провайдеры компонентов
import { QuizFormProvider, useQuizForm } from '@/components/quiz-form';
import { InlineButtonsProvider, useInlineButtons } from '@/components/inline-buttons';
import { MediaPreviewProvider, useMediaPreview } from '@/components/media-preview';
import { RichTextEditorProvider, useRichTextEditor } from '@/components/rich-text-editor';
import { DraftsProvider, useDrafts } from '@/components/drafts-modal';
import { TemplatesProvider, useTemplates } from '@/components/text-templates-modal';
import { PostSettingsProvider, usePostSettingsContext } from '@/components/post-settings/store';

// Импортируем API и хелперы
import { handlePublishNow, handlePublishSeriesNow, handleSaveDraft } from './actions';
import { templatesApi } from '@/stores/templates';
import type { Draft } from '@/stores/drafts';
import type { InlineKeyboard, InlineButton } from './types';
import type { ButtonRow } from '@/components/inline-buttons';
import type { MediaFile } from '@/components/media-preview';
import type { QuizFormState } from '@/components/quiz-form/store/types';

// Snapshot для серии постов
export interface PostSnapshot {
  text: string;
  showInlineButtons: boolean;
  buttonRows: ButtonRow[];
  mediaFiles: MediaFile[];
  showQuizForm: boolean;
  quizForm: QuizFormState;
  showLinkPreview: boolean;
}

interface CreatePostContextValue {
  // Publishing state
  isPublishing: boolean;
  isSavingDraft: boolean;
  isScheduling: boolean;
  isSavingTemplate: boolean;
  
  // Link preview
  showLinkPreview: boolean;
  setShowLinkPreview: (show: boolean) => void;
  
  // Mobile settings
  showMobileSettings: boolean;
  setShowMobileSettings: (show: boolean) => void;
  
  // File input ref
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  openFileDialog: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Actions
  publishNow: () => Promise<void>;
  publishSeriesNow: (snapshots: PostSnapshot[]) => Promise<{ success: boolean; message?: string }>;
  saveDraft: () => Promise<void>;
  saveAsTemplate: (selectedHtml?: string) => Promise<void>;
  
  // Snapshot helpers
  getSnapshot: () => PostSnapshot;
  loadSnapshot: (snapshot: PostSnapshot) => void;
  resetForm: () => void;
  
  // Draft/Template handlers
  handleSelectTemplate: (formattedContent: Record<string, unknown>) => void;
  handleSelectDraft: (draft: Draft) => void;
  
  // Computed
  canAddMedia: boolean;
  canShowInlineButtons: boolean;
  hasContentForPreview: boolean;
}

const CreatePostContext = createContext<CreatePostContextValue | null>(null);

// Внутренний компонент который использует все хуки
function CreatePostInner({ children }: { children: ReactNode }) {
  const { showSuccess, showError } = useNotifications();
  
  // Получаем данные из всех контекстов
  const richTextEditor = useRichTextEditor();
  const mediaPreview = useMediaPreview();
  const inlineButtons = useInlineButtons();
  const quizForm = useQuizForm();
  const postSettings = usePostSettingsContext();
  const drafts = useDrafts();
  const templates = useTemplates();
  
  // Локальный state
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Computed values
  const canAddMedia = mediaPreview.files.length < 10 &&
    !(inlineButtons.rows.length > 0 && mediaPreview.files.length >= 1);
  
  const canShowInlineButtons = mediaPreview.files.length <= 1;
  
  const hasContentForPreview = Boolean(
    richTextEditor.text || 
    mediaPreview.files.length > 0 || 
    (quizForm.isOpen && quizForm.getPollData())
  );
  
  // File upload
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const maxFiles = inlineButtons.rows.length > 0 ? 1 : 10;
    const currentCount = mediaPreview.files.length;
    const availableSlots = maxFiles - currentCount;
    
    if (availableSlots <= 0) {
      event.target.value = '';
      return;
    }
    
    const filesToAdd = Array.from(files).slice(0, availableSlots);
    
    const newMediaFiles: MediaFile[] = filesToAdd.map((file, index) => {
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document';
      
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`,
        url: URL.createObjectURL(file),
        preview_url: '',
        type,
        blur: false,
        file,
      } as MediaFile;
    });
    
    mediaPreview.addFiles(newMediaFiles);
    event.target.value = '';
  };
  
  // Build inline keyboard from buttonRows
  const getInlineKeyboard = (): InlineKeyboard | undefined => {
    if (!inlineButtons.isOpen || inlineButtons.rows.length === 0) return undefined;
    
    const buttons: InlineButton[][] = inlineButtons.rows.map(row =>
      row.buttons
        .filter(btn => btn.text && btn.text.trim().length > 0)
        .map(btn => {
          const button: InlineButton = { text: btn.text };
          if (btn.type === 'url' && btn.url) button.url = btn.url;
          if (btn.type === 'callback' && btn.callback_data) button.callback_data = btn.callback_data;
          return button;
        })
    ).filter(row => row.length > 0);
    
    return buttons.length > 0 ? { buttons } : undefined;
  };
  
  // Publish now
  const publishNow = async () => {
    const pollData = quizForm.getPollData();
    
    setIsPublishing(true);
    
    try {
      const result = await handlePublishNow(
        { text: richTextEditor.text },
        postSettings.getSettingsData(),
        mediaPreview.files,
        getInlineKeyboard(),
        pollData,
        quizForm.isOpen,
        showLinkPreview
      );
      
      if (result.success) {
        showSuccess(result.message);
        resetForm();
        postSettings.resetSettings();
        postSettings.loadRecentTags();
      } else {
        showError(result.message || 'Не удалось опубликовать пост');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при публикации';
      showError(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Publish series
  const publishSeriesNow = async (snapshots: PostSnapshot[]) => {
    setIsPublishing(true);
    
    try {
      const result = await handlePublishSeriesNow(
        snapshots.map(p => ({
          text: p.text,
          mediaFiles: p.mediaFiles,
          buttonRows: p.buttonRows,
          showInlineButtons: p.showInlineButtons,
          showQuizForm: p.showQuizForm,
          quizForm: p.quizForm,
          showLinkPreview: p.showLinkPreview,
        })),
        postSettings.getSettingsData(),
        { replyToPrevious: true }
      );
      
      if (result.success) {
        showSuccess(result.message || 'Серия поставлена в очередь');
        resetForm();
        postSettings.resetSettings();
        postSettings.loadRecentTags();
      } else {
        showError(result.message || 'Не удалось опубликовать серию');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
      showError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Save draft
  const saveDraft = async () => {
    const pollData = quizForm.getPollData();
    
    setIsSavingDraft(true);
    
    try {
      const result = await handleSaveDraft(
        { text: richTextEditor.text },
        postSettings.getSettingsData(),
        mediaPreview.files,
        getInlineKeyboard(),
        pollData,
        quizForm.isOpen,
        showLinkPreview
      );
      
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message || 'Не удалось сохранить черновик');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
      showError(errorMessage);
    } finally {
      setIsSavingDraft(false);
    }
  };
  
  // Save as template
  const saveAsTemplate = async (selectedHtml?: string) => {
    const htmlToSave = (selectedHtml && selectedHtml.trim()) ? selectedHtml : richTextEditor.text;
    if (!htmlToSave || htmlToSave.trim() === '') {
      showError('Текст пуст. Нечего сохранять в шаблон.');
      return;
    }
    
    setIsSavingTemplate(true);
    
    try {
      const plainText = htmlToSave.replace(/<[^>]*>/g, '').trim();
      const templateName = plainText.length > 50 ? plainText.substring(0, 50) : plainText;
      
      await templatesApi.createTemplate({
        name: templateName,
        formatted_content: { html: htmlToSave },
      });
      
      showSuccess('Шаблон успешно сохранен!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError(errorMessage);
    } finally {
      setIsSavingTemplate(false);
    }
  };
  
  // Snapshot functions
  const getSnapshot = (): PostSnapshot => ({
    text: richTextEditor.text,
    showInlineButtons: inlineButtons.isOpen,
    buttonRows: inlineButtons.rows,
    mediaFiles: mediaPreview.files,
    showQuizForm: quizForm.isOpen,
    quizForm: quizForm.state,
    showLinkPreview,
  });
  
  const loadSnapshot = (snapshot: PostSnapshot) => {
    richTextEditor.setText(snapshot.text);
    setShowLinkPreview(snapshot.showLinkPreview);
    
    if (snapshot.showInlineButtons) {
      inlineButtons.setRows(snapshot.buttonRows);
      if (!inlineButtons.isOpen) inlineButtons.open();
    } else {
      inlineButtons.close();
    }
    
    mediaPreview.setFiles(snapshot.mediaFiles);
    
    if (snapshot.showQuizForm) {
      quizForm.open();
      // TODO: restore quiz state
    } else {
      quizForm.close();
    }
  };
  
  const resetForm = () => {
    richTextEditor.reset();
    mediaPreview.clearFiles();
    inlineButtons.close();
    quizForm.close();
    setShowLinkPreview(false);
  };
  
  // Handle select template
  const handleSelectTemplate = (formattedContent: Record<string, unknown>) => {
    if (formattedContent?.html && typeof formattedContent.html === 'string') {
      richTextEditor.setText(formattedContent.html);
    }
  };
  
  // Handle select draft
  const handleSelectDraft = async (draft: Draft) => {
    try {
      resetForm();
      
      // Load text
      const text = draft.formatted_content?.text || draft.text_content || '';
      richTextEditor.setText(text);
      
      // Load media
      if (draft.media_urls && draft.media_urls.length > 0) {
        const files: MediaFile[] = draft.media_urls.map((url, index) => {
          const extension = url.split('.').pop()?.toLowerCase() || '';
          let type: 'image' | 'video' | 'document' = 'document';
          
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) type = 'image';
          else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) type = 'video';
          
          const thumbnailUrl = draft.media_thumbnail_urls?.[index] ?? null;
          
          return {
            id: `draft-${Date.now()}-${index}`,
            url,
            preview_url: thumbnailUrl || '',
            thumbnail_url: thumbnailUrl,
            type,
            blur: draft.media_blur?.[index] || false,
            telegram_file_id: draft.media_file_ids?.[index] ?? null,
          } as MediaFile;
        });
        
        mediaPreview.addFiles(files);
      }
      
      // Load inline buttons
      if (draft.inline_keyboard?.buttons) {
        const buttons = draft.inline_keyboard.buttons as InlineButton[][];
        const buttonRows: ButtonRow[] = buttons.map((row, rowIndex) => ({
          id: `row-${Date.now()}-${rowIndex}`,
          buttons: row.map((btn, btnIndex) => ({
            id: `btn-${Date.now()}-${rowIndex}-${btnIndex}`,
            text: btn.text,
            type: btn.url ? 'url' : 'callback',
            url: btn.url || '',
            callback_data: btn.callback_data || '',
          })),
        }));
        
        inlineButtons.setRows(buttonRows);
        inlineButtons.open();
      }
      
      // Load poll/quiz
      if (draft.poll_data) {
        quizForm.open();
        quizForm.setQuestion(draft.poll_data.question);
        
        if (draft.poll_data.is_quiz) {
          quizForm.setMode('quiz');
        } else if (draft.poll_data.allows_multiple_answers) {
          quizForm.setMode('poll_multi');
        } else {
          quizForm.setMode('poll_single');
        }
        
        // TODO: restore answers
      }
      
      showSuccess('Черновик загружен');
    } catch (error) {
      showError('Не удалось загрузить черновик');
    }
  };
  
  const value: CreatePostContextValue = {
    isPublishing,
    isSavingDraft,
    isScheduling,
    isSavingTemplate,
    showLinkPreview,
    setShowLinkPreview,
    showMobileSettings,
    setShowMobileSettings,
    fileInputRef,
    openFileDialog,
    handleFileUpload,
    publishNow,
    publishSeriesNow,
    saveDraft,
    saveAsTemplate,
    getSnapshot,
    loadSnapshot,
    resetForm,
    handleSelectTemplate,
    handleSelectDraft,
    canAddMedia,
    canShowInlineButtons,
    hasContentForPreview,
  };
  
  return <CreatePostContext.Provider value={value}>{children}</CreatePostContext.Provider>;
}

// Главный провайдер который оборачивает все остальные
export function CreatePostProvider({ children }: { children: ReactNode }) {
  return (
    <PostSettingsProvider>
      <RichTextEditorProvider>
        <MediaPreviewProvider>
          <InlineButtonsProvider>
            <QuizFormProvider>
              <DraftsProvider>
                <TemplatesProvider>
                  <CreatePostInner>{children}</CreatePostInner>
                </TemplatesProvider>
              </DraftsProvider>
            </QuizFormProvider>
          </InlineButtonsProvider>
        </MediaPreviewProvider>
      </RichTextEditorProvider>
    </PostSettingsProvider>
  );
}

export function useCreatePostContext() {
  const context = useContext(CreatePostContext);
  if (!context) {
    throw new Error('useCreatePostContext must be used within CreatePostProvider');
  }
  return context;
}
