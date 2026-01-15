'use client';

import { useReducer, useCallback, useRef } from 'react';
import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import type { ButtonRow } from '@/components/inline-buttons';
import type { RichTextEditorRef } from '@/components/rich-text-editor';
import { usePostSettings } from '@/components/post-settings/store';
import { handlePublishNow, handleSaveDraft } from './actions';
import { templatesApi } from '@/stores/templates';
import { draftsApi, type Draft } from '@/stores/drafts';
import type { InlineKeyboard, InlineButton } from './types';
import { useNotifications } from '@/components/notifications/NotificationProvider';

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

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      let width = video.videoWidth;
      let height = video.videoHeight;

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
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    video.src = objectUrl;
    video.load();
  });
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
}

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
};

type CreatePostAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'TOGGLE_INLINE_BUTTONS' }
  | { type: 'SET_BUTTON_ROWS'; payload: ButtonRow[] }
  | { type: 'ADD_MEDIA_FILES'; payload: MediaFile[] }
  | { type: 'REMOVE_MEDIA_FILE'; payload: string }
  | { type: 'TOGGLE_MEDIA_BLUR'; payload: string }
  | { type: 'CLEAR_MEDIA_FILES' }
  | { type: 'SET_IS_PUBLISHING'; payload: boolean }
  | { type: 'SET_IS_SAVING_DRAFT'; payload: boolean }
  | { type: 'SET_SHOW_DRAFTS_MODAL'; payload: boolean }
  | { type: 'SET_IS_SCHEDULING'; payload: boolean }
  | { type: 'SET_SHOW_TEMPLATES_MODAL'; payload: boolean }
  | { type: 'SET_IS_SAVING_TEMPLATE'; payload: boolean }
  | { type: 'RESET_FORM' };

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

    case 'SET_BUTTON_ROWS':
      return { ...state, buttonRows: action.payload };

    case 'ADD_MEDIA_FILES':
      return { ...state, mediaFiles: [...state.mediaFiles, ...action.payload] };

    case 'REMOVE_MEDIA_FILE': {
      const fileToRemove = state.mediaFiles.find(f => f.id === action.payload);
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

    case 'RESET_FORM':
      state.mediaFiles.forEach(f => {
        if (f.url.startsWith('blob:')) {
          URL.revokeObjectURL(f.url);
        }
      });
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

  const setText = useCallback((text: string) => {
    dispatch({ type: 'SET_TEXT', payload: text });
  }, []);

  const toggleSettings = useCallback(() => {
    dispatch({ type: 'TOGGLE_SETTINGS' });
  }, []);

  const setShowSettings = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_SETTINGS', payload: show });
  }, []);

  const toggleInlineButtons = useCallback(() => {
    dispatch({ type: 'TOGGLE_INLINE_BUTTONS' });
  }, []);

  const setButtonRows = useCallback((rows: ButtonRow[]) => {
    dispatch({ type: 'SET_BUTTON_ROWS', payload: rows });
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const newMediaFiles = await Promise.all(
      filesToAdd.map(async (file, index) => {
        const type = file.type.startsWith('image/') ? 'image'
                   : file.type.startsWith('video/') ? 'video'
                   : 'document';

        let thumbnailUrl = '';
        if (type === 'image') {
          thumbnailUrl = await createThumbnail(file);
        } else if (type === 'video') {
          thumbnailUrl = await createVideoThumbnail(file);
        }

        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`,
          url: thumbnailUrl,
          type,
          blur: false,
          file,
        } as MediaFile;
      })
    );

    dispatch({ type: 'ADD_MEDIA_FILES', payload: newMediaFiles });
    event.target.value = '';
  }, [state.buttonRows.length, state.mediaFiles.length]);

  const handleRemoveMedia = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MEDIA_FILE', payload: id });
  }, []);

  const handleToggleBlur = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_MEDIA_BLUR', payload: id });
  }, []);

  const setShowTemplatesModal = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_TEMPLATES_MODAL', payload: show });
  }, []);

  const setShowDraftsModal = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_DRAFTS_MODAL', payload: show });
  }, []);

  const getInlineKeyboard = useCallback((): InlineKeyboard | undefined => {
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
  }, [state.buttonRows]);

  const onPublishNow = useCallback(async () => {
    dispatch({ type: 'SET_IS_PUBLISHING', payload: true });

    try {
      const result = await handlePublishNow(
        { text: state.text },
        postSettings.getSettingsData(),
        state.mediaFiles,
        getInlineKeyboard()
      );

      if (result.success) {
        showSuccess(result.message);
        editorRef.current?.reset();
        postSettings.resetSettings();
        dispatch({ type: 'RESET_FORM' });
        postSettings.loadRecentTags();
      } else {
        showError(result.message || 'Не удалось опубликовать пост');
        if (result.errors) {
          console.error('Детали ошибки:', result.errors);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при публикации';
      showError(errorMessage);
      console.error('Ошибка публикации:', error);
    } finally {
      dispatch({ type: 'SET_IS_PUBLISHING', payload: false });
    }
  }, [state.text, state.mediaFiles, postSettings, getInlineKeyboard, showSuccess, showError]);

  const onSaveDraft = useCallback(async () => {
    dispatch({ type: 'SET_IS_SAVING_DRAFT', payload: true });

    try {
      const result = await handleSaveDraft(
        { text: state.text },
        postSettings.getSettingsData(),
        state.mediaFiles,
        getInlineKeyboard()
      );

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message || 'Не удалось сохранить черновик');
        if (result.errors) {
          console.error('Детали ошибки:', result.errors);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка при сохранении';
      showError(errorMessage);
      console.error('Ошибка сохранения:', error);
    } finally {
      dispatch({ type: 'SET_IS_SAVING_DRAFT', payload: false });
    }
  }, [state.text, state.mediaFiles, postSettings, getInlineKeyboard, showSuccess, showError]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!state.text || state.text.trim() === '') {
      showError('Текст пуст. Нечего сохранять в шаблон.');
      return;
    }

    dispatch({ type: 'SET_IS_SAVING_TEMPLATE', payload: true });

    try {
      const plainText = state.text.replace(/<[^>]*>/g, '').trim();
      const templateName = plainText.length > 50
        ? plainText.substring(0, 50)
        : plainText;

      await templatesApi.createTemplate({
        name: templateName,
        formatted_content: { html: state.text },
      });

      showSuccess('Шаблон успешно сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения шаблона:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при сохранении шаблона';
      showError(errorMessage);
    } finally {
      dispatch({ type: 'SET_IS_SAVING_TEMPLATE', payload: false });
    }
  }, [state.text, showSuccess, showError]);

  const handleSelectTemplate = useCallback((formattedContent: Record<string, unknown>) => {
    if (formattedContent?.html && typeof formattedContent.html === 'string') {
      dispatch({ type: 'SET_TEXT', payload: formattedContent.html });
    }
  }, []);

  const handleSelectDraft = useCallback(async (draft: Draft) => {
    try {
      const text = draft.formatted_content?.text || draft.text_content || '';
      dispatch({ type: 'SET_TEXT', payload: text });

      if (draft.media_urls && draft.media_urls.length > 0) {
        const mediaFiles: MediaFile[] = await Promise.all(
          draft.media_urls.map(async (url, index) => {
            const extension = url.split('.').pop()?.toLowerCase() || '';
            let type: 'image' | 'video' | 'document' = 'document';
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
              type = 'image';
            } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) {
              type = 'video';
            }

            return {
              id: `draft-${Date.now()}-${index}`,
              url: url,
              type,
              blur: draft.media_blur?.[index] || false,
            } as MediaFile;
          })
        );

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

      showSuccess('Черновик загружен');
    } catch (error) {
      console.error('Failed to load draft:', error);
      showError('Не удалось загрузить черновик');
    }
  }, [showSuccess, showError]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
    setText,
    toggleSettings,
    setShowSettings,
    toggleInlineButtons,
    setButtonRows,
    handleFileUpload,
    handleRemoveMedia,
    handleToggleBlur,
    setShowTemplatesModal,
    setShowDraftsModal,
    onPublishNow,
    onSaveDraft,
    handleSaveAsTemplate,
    handleSelectTemplate,
    handleSelectDraft,
    openFileDialog,
  };
}

export type CreatePostStore = ReturnType<typeof useCreatePost>;
