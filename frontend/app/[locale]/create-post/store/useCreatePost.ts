'use client';

import { useReducer, useRef } from 'react';
import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import type { ButtonRow } from '@/components/inline-buttons';
import type { RichTextEditorRef } from '@/components/rich-text-editor';
import { usePostSettings } from '@/components/post-settings/store';
import { handlePublishNow, handlePublishSeriesNow, handleSaveDraft } from './actions';
import { templatesApi } from '@/stores/templates';
import { draftsApi, type Draft } from '@/stores/drafts';
import type { InlineKeyboard, InlineButton, PollData } from './types';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { uploadMediaFiles } from './api';

import { initialQuizFormState, quizFormReducer } from '@/components/quiz-form/store/reducer';
import { selectPollData as selectQuizPollData } from '@/components/quiz-form/store/selectors';
import type { QuizFormAction, QuizFormState } from '@/components/quiz-form/store/types';

const THUMBNAIL_MAX_SIZE = 200;

function createThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > THUMBNAIL_MAX_SIZE) {
          height = (height * THUMBNAIL_MAX_SIZE) / width;
          width = THUMBNAIL_MAX_SIZE;
        }
      } else {
        if (height > THUMBNAIL_MAX_SIZE) {
          width = (width * THUMBNAIL_MAX_SIZE) / height;
          height = THUMBNAIL_MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(objectUrl);
            }
          },
          'image/jpeg',
          0.7
        );
      } else {
        resolve(objectUrl);
      }
    };

    img.onerror = () => {
      resolve(objectUrl);
    };

    img.src = objectUrl;
  });
}

function createVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Берём кадр через 0.1 секунду от начала
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        let width = video.videoWidth;
        let height = video.videoHeight;

        // Resize до 200px как для изображений
        if (width > height) {
          if (width > THUMBNAIL_MAX_SIZE) {
            height = (height * THUMBNAIL_MAX_SIZE) / width;
            width = THUMBNAIL_MAX_SIZE;
          }
        } else {
          if (height > THUMBNAIL_MAX_SIZE) {
            width = (width * THUMBNAIL_MAX_SIZE) / height;
            height = THUMBNAIL_MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                resolve('');
              }
            },
            'image/jpeg',
            0.7
          );
        } else {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        }
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    video.src = objectUrl;
  });
}

async function createThumbnailFromUrl(url: string): Promise<string> {
  try {
    // Используем proxy для обхода CORS
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const proxyUrl = `${baseUrl}/media/proxy?url=${encodeURIComponent(url)}`;
    
    const resp = await fetch(proxyUrl);
    if (!resp.ok) return '';
    const blob = await resp.blob();
    if (!blob.type.startsWith('image/')) return '';

    const file = new File([blob], 'draft-image', { type: blob.type });
    return await createThumbnail(file);
  } catch {
    return '';
  }
}

interface CreatePostState {
  text: string;
  showSettings: boolean;
  showInlineButtons: boolean;
  buttonRows: ButtonRow[];
  mediaFiles: MediaFile[];
  isPublishing: boolean;
  isSavingDraft: boolean;
  isScheduling: boolean;
  showTemplatesModal: boolean;
  showDraftsModal: boolean;
  isSavingTemplate: boolean;
  showQuizForm: boolean;
  quizForm: QuizFormState;
  showLinkPreview: boolean;
}

export type CreatePostSnapshot = Pick<
  CreatePostState,
  'text' | 'showInlineButtons' | 'buttonRows' | 'mediaFiles' | 'showQuizForm' | 'quizForm' | 'showLinkPreview'
>;

const initialState: CreatePostState = {
  text: '',
  showSettings: false,
  showInlineButtons: false,
  buttonRows: [],
  mediaFiles: [],
  isPublishing: false,
  isSavingDraft: false,
  isScheduling: false,
  showDraftsModal: false,
  showTemplatesModal: false,
  isSavingTemplate: false,
  showQuizForm: false,
  quizForm: initialQuizFormState,
  showLinkPreview: false,
};

type CreatePostAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'TOGGLE_INLINE_BUTTONS' }
  | { type: 'SET_SHOW_INLINE_BUTTONS'; payload: boolean }
  | { type: 'SET_BUTTON_ROWS'; payload: ButtonRow[] }
  | { type: 'ADD_MEDIA_FILES'; payload: MediaFile[] }
  | { type: 'SET_MEDIA_PREVIEW_URL'; payload: { id: string; preview_url: string } }
  | { type: 'SET_MEDIA_THUMBNAIL_URL'; payload: { id: string; thumbnail_url: string | null } }
  | { type: 'REMOVE_MEDIA_FILE'; payload: string }
  | { type: 'TOGGLE_MEDIA_BLUR'; payload: string }
  | { type: 'CLEAR_MEDIA_FILES' }
  | { type: 'SET_IS_PUBLISHING'; payload: boolean }
  | { type: 'SET_IS_SAVING_DRAFT'; payload: boolean }
  | { type: 'SET_SHOW_DRAFTS_MODAL'; payload: boolean }
  | { type: 'SET_IS_SCHEDULING'; payload: boolean }
  | { type: 'SET_SHOW_TEMPLATES_MODAL'; payload: boolean }
  | { type: 'SET_IS_SAVING_TEMPLATE'; payload: boolean }
  | { type: 'SET_SHOW_QUIZ_FORM'; payload: boolean }
  | { type: 'SET_SHOW_LINK_PREVIEW'; payload: boolean }
  | { type: 'SET_QUIZ_FORM_STATE'; payload: QuizFormState }
  | { type: 'QUIZ_FORM'; payload: QuizFormAction }
  | { type: 'RESET_FORM' }
  | { type: 'RESET_FORM_PRESERVE_MEDIA_URLS' };

function createPostReducer(state: CreatePostState, action: CreatePostAction): CreatePostState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, text: action.payload };

    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings };

    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };

    case 'TOGGLE_INLINE_BUTTONS': {
      const shouldShow = !state.showInlineButtons;
      if (shouldShow && state.buttonRows.length === 0) {
        return {
          ...state,
          showInlineButtons: true,
          buttonRows: [{
            id: `row-${Date.now()}`,
            buttons: [{
              id: `btn-${Date.now()}`,
              text: '',
              type: 'url',
              url: '',
            }],
          }],
        };
      }
      return { ...state, showInlineButtons: shouldShow };
    }

    case 'SET_SHOW_INLINE_BUTTONS': {
      if (action.payload && state.buttonRows.length === 0) {
        return {
          ...state,
          showInlineButtons: true,
          buttonRows: [{
            id: `row-${Date.now()}`,
            buttons: [{
              id: `btn-${Date.now()}`,
              text: '',
              type: 'url',
              url: '',
            }],
          }],
        };
      }
      return { ...state, showInlineButtons: action.payload };
    }

    case 'SET_BUTTON_ROWS':
      return { ...state, buttonRows: action.payload };

    case 'ADD_MEDIA_FILES':
      return { ...state, mediaFiles: [...state.mediaFiles, ...action.payload] };

    case 'SET_MEDIA_PREVIEW_URL': {
      const { id, preview_url } = action.payload;
      return {
        ...state,
        mediaFiles: state.mediaFiles.map(f => {
          if (f.id !== id) return f;
          if (f.preview_url && f.preview_url.startsWith('blob:')) {
            URL.revokeObjectURL(f.preview_url);
          }
          return { ...f, preview_url };
        }),
      };
    }

    case 'SET_MEDIA_THUMBNAIL_URL': {
      const { id, thumbnail_url } = action.payload;
      return {
        ...state,
        mediaFiles: state.mediaFiles.map(f => 
          f.id === id ? { ...f, thumbnail_url } : f
        ),
      };
    }

    case 'REMOVE_MEDIA_FILE': {
      const fileToRemove = state.mediaFiles.find(f => f.id === action.payload);
      if (fileToRemove?.preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview_url);
      }
      if (fileToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return {
        ...state,
        mediaFiles: state.mediaFiles.filter(f => f.id !== action.payload),
      };
    }

    case 'TOGGLE_MEDIA_BLUR':
      return {
        ...state,
        mediaFiles: state.mediaFiles.map(f =>
          f.id === action.payload ? { ...f, blur: !f.blur } : f
        ),
      };

    case 'CLEAR_MEDIA_FILES':
      state.mediaFiles.forEach(f => {
        if (f.preview_url?.startsWith('blob:')) {
          URL.revokeObjectURL(f.preview_url);
        }
        if (f.url.startsWith('blob:')) {
          URL.revokeObjectURL(f.url);
        }
      });
      return { ...state, mediaFiles: [] };

    case 'SET_IS_PUBLISHING':
      return { ...state, isPublishing: action.payload };

    case 'SET_IS_SAVING_DRAFT':
      return { ...state, isSavingDraft: action.payload };

    case 'SET_IS_SCHEDULING':
      return { ...state, isScheduling: action.payload };

    case 'SET_SHOW_TEMPLATES_MODAL':
      return { ...state, showTemplatesModal: action.payload };

    case 'SET_SHOW_DRAFTS_MODAL':
      return { ...state, showDraftsModal: action.payload };

    case 'SET_IS_SAVING_TEMPLATE':
      return { ...state, isSavingTemplate: action.payload };

    case 'SET_SHOW_QUIZ_FORM':
      return {
        ...state,
        showQuizForm: action.payload,
        quizForm: action.payload ? state.quizForm : initialQuizFormState,
      };

    case 'SET_SHOW_LINK_PREVIEW':
      return { ...state, showLinkPreview: action.payload };

    case 'SET_QUIZ_FORM_STATE':
      return { ...state, quizForm: action.payload };

    case 'QUIZ_FORM':
      return { ...state, quizForm: quizFormReducer(state.quizForm, action.payload) };

    case 'RESET_FORM':
      state.mediaFiles.forEach(f => {
        if (f.preview_url?.startsWith('blob:')) {
          URL.revokeObjectURL(f.preview_url);
        }
        if (f.url.startsWith('blob:')) {
          URL.revokeObjectURL(f.url);
        }
      });
      return initialState;

    case 'RESET_FORM_PRESERVE_MEDIA_URLS':
      return initialState;

    default:
      return state;
  }
}

export function useCreatePost() {
  const [state, dispatch] = useReducer(createPostReducer, initialState);
  const postSettings = usePostSettings();
  const editorRef = useRef<RichTextEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useNotifications();

  const quizFormDispatch = (quizAction: QuizFormAction) => {
    dispatch({ type: 'QUIZ_FORM', payload: quizAction });
  };

  const setText = (text: string) => {
    dispatch({ type: 'SET_TEXT', payload: text });
  };

  const toggleSettings = () => {
    dispatch({ type: 'TOGGLE_SETTINGS' });
  };

  const setShowSettings = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_SETTINGS', payload: show });
  };

  const toggleInlineButtons = () => {
    dispatch({ type: 'TOGGLE_INLINE_BUTTONS' });
  };

  const setButtonRows = (rows: ButtonRow[]) => {
    dispatch({ type: 'SET_BUTTON_ROWS', payload: rows });
  };

  const getSnapshot = (): CreatePostSnapshot => ({
    text: state.text,
    showInlineButtons: state.showInlineButtons,
    buttonRows: state.buttonRows,
    mediaFiles: state.mediaFiles,
    showQuizForm: state.showQuizForm,
    quizForm: state.quizForm,
    showLinkPreview: state.showLinkPreview,
  });

  const resetForm = (options?: { preserveMediaUrls?: boolean }) => {
    const preserveMediaUrls = options?.preserveMediaUrls ?? false;
    editorRef.current?.reset();
    dispatch({ type: preserveMediaUrls ? 'RESET_FORM_PRESERVE_MEDIA_URLS' : 'RESET_FORM' });
  };

  const loadSnapshot = (snapshot: CreatePostSnapshot) => {
    resetForm({ preserveMediaUrls: true });

    dispatch({ type: 'SET_TEXT', payload: snapshot.text });
    dispatch({ type: 'SET_SHOW_LINK_PREVIEW', payload: snapshot.showLinkPreview });

    dispatch({ type: 'SET_BUTTON_ROWS', payload: snapshot.buttonRows });
    dispatch({ type: 'SET_SHOW_INLINE_BUTTONS', payload: snapshot.showInlineButtons });

    if (snapshot.mediaFiles.length > 0) {
      dispatch({ type: 'ADD_MEDIA_FILES', payload: snapshot.mediaFiles });
    }

    dispatch({ type: 'SET_SHOW_QUIZ_FORM', payload: snapshot.showQuizForm });
    if (snapshot.showQuizForm) {
      dispatch({ type: 'SET_QUIZ_FORM_STATE', payload: snapshot.quizForm });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxFiles = state.buttonRows.length > 0 ? 1 : 10;
    const currentCount = state.mediaFiles.length;
    const availableSlots = maxFiles - currentCount;

    if (availableSlots <= 0) {
      event.target.value = '';
      return;
    }

    const filesToAdd = Array.from(files).slice(0, availableSlots);

    // Сначала добавляем элементы (без тяжёлой генерации превью), чтобы UI не фризил.
    const newMediaFiles: MediaFile[] = filesToAdd.map((file, index) => {
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
          : 'document';

      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`,
        url: '',
        preview_url: '',
        type,
        blur: false,
        file,
      } as MediaFile;
    });

    dispatch({ type: 'ADD_MEDIA_FILES', payload: newMediaFiles });

    // Генерируем локальные превьюшки (быстро, без загрузки на сервер)
    ;(async () => {
      for (const media of newMediaFiles) {
        try {
          const file = media.file;
          if (!file) continue;

          let preview = '';
          if (media.type === 'image') {
            preview = await createThumbnail(file);
          } else if (media.type === 'video') {
            preview = await createVideoThumbnail(file);
          }

          if (preview) {
            dispatch({ type: 'SET_MEDIA_PREVIEW_URL', payload: { id: media.id, preview_url: preview } });
          }

          await new Promise<void>(r => requestAnimationFrame(() => r()));
        } catch {
          // ignore
        }
      }
    })();

    event.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    dispatch({ type: 'REMOVE_MEDIA_FILE', payload: id });
  };

  const handleToggleBlur = (id: string) => {
    dispatch({ type: 'TOGGLE_MEDIA_BLUR', payload: id });
  };

  const setShowTemplatesModal = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_TEMPLATES_MODAL', payload: show });
  };

  const setShowDraftsModal = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_DRAFTS_MODAL', payload: show });
  };

  const setShowQuizForm = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_QUIZ_FORM', payload: show });
  };

  const setShowLinkPreview = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_LINK_PREVIEW', payload: show });
  };

  const getInlineKeyboard = (): InlineKeyboard | undefined => {
    if (state.buttonRows.length === 0) return undefined;

    const buttons: InlineButton[][] = state.buttonRows.map(row =>
      row.buttons.map(btn => {
        const button: InlineButton = { text: btn.text };
        if (btn.type === 'url' && btn.url) {
          button.url = btn.url;
        } else if (btn.type === 'callback' && btn.callback_data) {
          button.callback_data = btn.callback_data;
        }
        return button;
      })
    );

    return { buttons };
  };

  const onPublishNow = async () => {
    const pollData = selectQuizPollData(state.quizForm);

    dispatch({ type: 'SET_IS_PUBLISHING', payload: true });

    try {
      const result = await handlePublishNow(
        { text: state.text },
        postSettings.getSettingsData(),
        state.mediaFiles,
        getInlineKeyboard(),
        pollData,
        state.showQuizForm,
        state.showLinkPreview
      );

      if (result.success) {
        showSuccess(result.message);
        editorRef.current?.reset();
        postSettings.resetSettings();
        dispatch({ type: 'RESET_FORM' });
        postSettings.loadRecentTags();
      } else {
        showError(result.message || 'Не удалось опубликовать пост');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при публикации';
      showError(errorMessage);
      console.error('Ошибка публикации:', error);
    } finally {
      dispatch({ type: 'SET_IS_PUBLISHING', payload: false });
    }
  };

  const onPublishSeriesNow = async (posts: CreatePostSnapshot[]) => {
    dispatch({ type: 'SET_IS_PUBLISHING', payload: true });

    try {
      const result = await handlePublishSeriesNow(
        posts.map(p => ({
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
        editorRef.current?.reset();
        postSettings.resetSettings();
        dispatch({ type: 'RESET_FORM' });
        postSettings.loadRecentTags();
      } else {
        showError(result.message || 'Не удалось опубликовать серию');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при публикации серии';
      showError(errorMessage);
      console.error('Ошибка публикации серии:', error);
      return { success: false, message: errorMessage };
    } finally {
      dispatch({ type: 'SET_IS_PUBLISHING', payload: false });
    }
  };

  const onSaveDraft = async () => {
    const pollData = selectQuizPollData(state.quizForm);

    dispatch({ type: 'SET_IS_SAVING_DRAFT', payload: true });

    try {
      const result = await handleSaveDraft(
        { text: state.text },
        postSettings.getSettingsData(),
        state.mediaFiles,
        getInlineKeyboard(),
        pollData,
        state.showQuizForm,
        state.showLinkPreview
      );

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message || 'Не удалось сохранить черновик');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при сохранении';
      showError(errorMessage);
      console.error('Ошибка сохранения:', error);
    } finally {
      dispatch({ type: 'SET_IS_SAVING_DRAFT', payload: false });
    }
  };

  const handleSaveAsTemplate = async (selectedHtml?: string) => {
    const htmlToSave = (selectedHtml && selectedHtml.trim()) ? selectedHtml : state.text;
    if (!htmlToSave || htmlToSave.trim() === '') {
      showError('Текст пуст. Нечего сохранять в шаблон.');
      return;
    }

    dispatch({ type: 'SET_IS_SAVING_TEMPLATE', payload: true });

    try {
      const plainText = htmlToSave.replace(/<[^>]*>/g, '').trim();
      const templateName = plainText.length > 50
        ? plainText.substring(0, 50)
        : plainText;

      await templatesApi.createTemplate({
        name: templateName,
        formatted_content: { html: htmlToSave },
      });

      showSuccess('Шаблон успешно сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения шаблона:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при сохранении шаблона';
      showError(errorMessage);
    } finally {
      dispatch({ type: 'SET_IS_SAVING_TEMPLATE', payload: false });
    }
  };

  const handleSelectTemplate = (formattedContent: Record<string, unknown>) => {
    if (formattedContent?.html && typeof formattedContent.html === 'string') {
      dispatch({ type: 'SET_TEXT', payload: formattedContent.html });
    }
  };

  const handleSelectDraft = async (draft: Draft) => {
    try {
      // Полностью очищаем текущее состояние поста
      dispatch({ type: 'RESET_FORM' });
      editorRef.current?.reset();

      // Загружаем текст из черновика
      const text = draft.formatted_content?.text || draft.text_content || '';
      dispatch({ type: 'SET_TEXT', payload: text });

      // Загружаем медиа из черновика
      if (draft.media_urls && draft.media_urls.length > 0) {
        const mediaFiles: MediaFile[] = draft.media_urls.map((url, index) => {
          const extension = url.split('.').pop()?.toLowerCase() || '';
          let type: 'image' | 'video' | 'document' = 'document';
          
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            type = 'image';
          } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) {
            type = 'video';
          }

          // Используем готовый thumbnail с бэкенда
          const thumbnailUrl = draft.media_thumbnail_urls?.[index] ?? null;

          return {
            id: `draft-${Date.now()}-${index}`,
            url: url,
            preview_url: thumbnailUrl || '',
            thumbnail_url: thumbnailUrl,
            type,
            blur: draft.media_blur?.[index] || false,
            telegram_file_id: draft.media_file_ids?.[index] ?? null,
          } as MediaFile;
        });

        dispatch({ type: 'ADD_MEDIA_FILES', payload: mediaFiles });
      }

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

        dispatch({ type: 'SET_BUTTON_ROWS', payload: buttonRows });
        dispatch({ type: 'TOGGLE_INLINE_BUTTONS' });
      }

      // Restore poll/quiz if present
      if (draft.poll_data) {
        const pollData = draft.poll_data;
        const quizMode = pollData.is_quiz ?? false;
        
        // Determine mode
        let mode: 'quiz' | 'poll_single' | 'poll_multi' = 'poll_single';
        if (quizMode) {
          mode = 'quiz';
        } else if (pollData.allows_multiple_answers) {
          mode = 'poll_multi';
        }

        // Reset form first
        dispatch({ 
          type: 'QUIZ_FORM', 
          payload: { type: 'RESET' } 
        });

        // Set mode
        dispatch({ 
          type: 'QUIZ_FORM', 
          payload: { type: 'SET_MODE', payload: mode } 
        });

        // Set question
        dispatch({ 
          type: 'QUIZ_FORM', 
          payload: { type: 'SET_QUESTION', payload: pollData.question } 
        });

        // Add answers (need to add enough slots first, starting from 2 default ones)
        const neededAnswers = pollData.options.length;
        const currentAnswers = 2; // initial state has 2 answers
        
        for (let i = currentAnswers; i < neededAnswers; i++) {
          dispatch({ 
            type: 'QUIZ_FORM', 
            payload: { type: 'ADD_ANSWER' } 
          });
        }

        // Now set answer texts by id (after we know the ids from current state)
        // We need to get the answer ids from the current state after adding
        // Since we don't have access to intermediate state here, we'll use a workaround:
        // dispatch all answer updates in sequence
        setTimeout(() => {
          const currentAnswers = state.quizForm.answers;
          pollData.options.forEach((optionText, index) => {
            if (currentAnswers[index]) {
              dispatch({ 
                type: 'QUIZ_FORM', 
                payload: { 
                  type: 'SET_ANSWER_TEXT', 
                  payload: { id: currentAnswers[index].id, text: optionText } 
                } 
              });
            }
          });

          // Set correct answer for quiz
          if (quizMode && pollData.correct_option_id !== null && pollData.correct_option_id !== undefined) {
            const correctAnswerId = currentAnswers[pollData.correct_option_id]?.id;
            if (correctAnswerId) {
              dispatch({ 
                type: 'QUIZ_FORM', 
                payload: { type: 'SET_CORRECT_ANSWER', payload: { id: correctAnswerId } } 
              });
            }
          }
        }, 0);

        // Open quiz form
        dispatch({ type: 'SET_SHOW_QUIZ_FORM', payload: true });
      }

      showSuccess('Черновик загружен');
    } catch (error) {
      console.error('Failed to load draft:', error);
      showError('Не удалось загрузить черновик');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const canAddMedia = state.mediaFiles.length < 10 &&
    !(state.buttonRows.length > 0 && state.mediaFiles.length >= 1);

  const canShowInlineButtons = state.mediaFiles.length <= 1;

  return {
    ...state,
    editorRef,
    fileInputRef,
    postSettings,
    canAddMedia,
    canShowInlineButtons,
    quizFormState: state.quizForm,
    quizFormDispatch,
    setText,
    toggleSettings,
    setShowSettings,
    toggleInlineButtons,
    setButtonRows,
    getSnapshot,
    loadSnapshot,
    resetForm,
    handleFileUpload,
    handleRemoveMedia,
    handleToggleBlur,
    setShowTemplatesModal,
    setShowDraftsModal,
    setShowQuizForm,
    setShowLinkPreview,
    onPublishNow,
    onPublishSeriesNow,
    onSaveDraft,
    handleSaveAsTemplate,
    handleSelectTemplate,
    handleSelectDraft,
    openFileDialog,
  };
}

export type CreatePostStore = ReturnType<typeof useCreatePost>;
