import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../index';
import { apiRequest, API_BASE_URL } from './api';
import type { Draft, PostSnapshot } from '../types';
import type { DraftListResponse } from '@/types/post';
import { setText, setShowLinkPreview } from '../slices/editor';
import { setFiles, clearFiles, updateFile } from '../slices/media';
import { setRows, openInlineButtons, resetInlineButtons } from '../slices/inlineButtons';
import { setMode, setQuestion, setAnswers, setCorrectAnswer, openQuiz, resetQuiz } from '../slices/quiz';
import { setChannels as setChannelSelections } from '../slices/channels';
import { addTag, clearTags } from '../slices/settings';
import { setSnapshots, setActiveIndex, resetSeries } from '../slices/series';
import { fetchChannelsThunk } from './channels';
import { fetchTagsThunk } from './tags';
import type { TagColor } from '@/types';
import { TAG_COLORS } from '@/types';
import { draftToPostSnapshot } from '../../utils/draftToPostSnapshot';

export const loadChannels = createAsyncThunk(
  'createPost/loadChannels',
  async (_, { dispatch }) => {
    return dispatch(fetchChannelsThunk({}));
  }
);

export const loadRecentTags = createAsyncThunk(
  'createPost/loadRecentTags',
  async (_, { dispatch }) => {
    return dispatch(fetchTagsThunk({}));
  }
);

export const loadDraftById = createAsyncThunk(
  'createPost/loadDraftById',
  async (draftId: number, { dispatch, getState, rejectWithValue }) => {
    try {
      const draft = await apiRequest<Draft>(`/publications/${draftId}`);

      if (draft.series_id) {
        const qs = new URLSearchParams({
          status: 'draft',
          series_id: String(draft.series_id),
          page_size: '200',
          sort_order: 'asc',
          date_mode: 'updated',
        });
        const list = await apiRequest<DraftListResponse>(`/publications?${qs}`);
        const members = [...list.items].sort((a, b) => {
          const ao = a.series_order ?? a.id;
          const bo = b.series_order ?? b.id;
          return ao - bo;
        });

        if (members.length >= 2) {
          const snapshots = members.map(draftToPostSnapshot);
          const activeIndex = Math.max(0, members.findIndex((d) => d.id === draftId));
          dispatch(setSnapshots(snapshots));
          dispatch(setActiveIndex(activeIndex));
          applyPostSnapshotToStore(snapshots[activeIndex], dispatch as AppDispatch);
        } else {
          dispatch(resetSeries());
          const snap = draftToPostSnapshot(draft);
          dispatch(setSnapshots([snap]));
          dispatch(setActiveIndex(0));
          applyPostSnapshotToStore(snap, dispatch as AppDispatch);
        }
      } else {
        dispatch(resetSeries());
        const snap = draftToPostSnapshot(draft);
        dispatch(setSnapshots([snap]));
        dispatch(setActiveIndex(0));
        applyPostSnapshotToStore(snap, dispatch as AppDispatch);
      }

      const state = getState() as RootState;
      const channelIds = new Set((draft.channels || []).map((ch) => ch.id));
      if (state.channels.channels.length > 0) {
        const next = state.channels.channels.map((ch) => ({
          ...ch,
          selected: channelIds.size > 0 ? channelIds.has(ch.id) : false,
        }));
        dispatch(setChannelSelections(next));
      }

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
    }
  }
);

export const loadDraftByToken = createAsyncThunk(
  'createPost/loadDraftByToken',
  async (token: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/publications/shared/${token}`);
      if (response.status === 404) {
        return rejectWithValue('Ссылка недействительна, истекла или уже была использована');
      }
      if (!response.ok) {
        return rejectWithValue('Не удалось загрузить черновик по ссылке');
      }
      const draft = await response.json() as Draft;

      dispatch(resetSeries());
      const snap = draftToPostSnapshot(draft);
      dispatch(setSnapshots([snap]));
      dispatch(setActiveIndex(0));
      applyPostSnapshotToStore(snap, dispatch as AppDispatch);

      const state = getState() as RootState;
      const channelIds = new Set((draft.channels || []).map((ch) => ch.id));
      if (state.channels.channels.length > 0) {
        const next = state.channels.channels.map((ch) => ({
          ...ch,
          selected: channelIds.size > 0 ? channelIds.has(ch.id) : false,
        }));
        dispatch(setChannelSelections(next));
      }

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
    }
  }
);

export function applyPostSnapshotToStore(snapshot: PostSnapshot, dispatch: AppDispatch) {
  dispatch(setText(snapshot.text));
  dispatch(setShowLinkPreview(snapshot.showLinkPreview));

  if (snapshot.mediaFiles.length > 0) {
    dispatch(setFiles(snapshot.mediaFiles));

    const docsToMeasure = snapshot.mediaFiles.filter((m) => m.type === 'document' && !m.size && m.url);
    if (docsToMeasure.length > 0) {
      const fetchContentLength = async (url: string): Promise<number | null> => {
        try {
          const head = await fetch(url, { method: 'HEAD' });
          const length = head.headers.get('content-length');
          if (length) return Number(length);
        } catch {
          // fall through
        }
        try {
          const range = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
          const contentRange = range.headers.get('content-range');
          if (contentRange) {
            const total = contentRange.split('/')[1];
            if (total) return Number(total);
          }
          const length = range.headers.get('content-length');
          if (length) return Number(length);
        } catch {
          // ignore
        }
        return null;
      };

      void Promise.all(
        docsToMeasure.map(async (doc) => {
          const size = await fetchContentLength(doc.url as string);
          if (size) {
            dispatch(updateFile({ id: doc.id, updates: { size } }));
          }
        })
      );
    }
  } else {
    dispatch(clearFiles());
  }

  if (snapshot.inlineButtonsOpen && snapshot.buttonRows.length > 0) {
    dispatch(setRows(snapshot.buttonRows));
    dispatch(openInlineButtons());
  } else {
    dispatch(resetInlineButtons());
  }

  if (snapshot.quizOpen) {
    dispatch(setQuestion(snapshot.quizQuestion));
    dispatch(setAnswers(snapshot.quizAnswers));
    dispatch(setMode(snapshot.quizMode));
    if (snapshot.quizCorrectAnswerId) {
      dispatch(setCorrectAnswer(snapshot.quizCorrectAnswerId));
    }
    dispatch(openQuiz());
  } else {
    dispatch(resetQuiz());
  }

  if (snapshot.selectedTags !== undefined) {
    dispatch(clearTags());
    for (const tag of snapshot.selectedTags) {
      const validColor = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
        ? (tag.color as TagColor)
        : '#FAC7C7';
      dispatch(addTag({ name: tag.name, color: validColor }));
    }
  }
}

export function loadDraftIntoStore(draft: Draft, dispatch: AppDispatch) {
  dispatch(resetSeries());
  const snap = draftToPostSnapshot(draft);
  dispatch(setSnapshots([snap]));
  dispatch(setActiveIndex(0));
  applyPostSnapshotToStore(snap, dispatch);
}
