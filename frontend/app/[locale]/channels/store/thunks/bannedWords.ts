import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setRules,
  addRule,
  removeRule,
  setInputValue,
  setSaving,
  setError,
  setEnabled,
} from '../slices/bannedWords';
import type { ChannelsPageState } from '../index';

interface RuleResponse {
  id: number;
  channel_id: number;
  action: string;
  phrase: string;
  mute_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface RulesListResponse {
  items: RuleResponse[];
  total: number;
}

export const fetchBannedWordsThunk = createAsyncThunk(
  'bannedWords/fetch',
  async (channelId: number, { dispatch }) => {
    try {
      const [rulesData, toggleData] = await Promise.all([
        apiRequest<RulesListResponse>(`/channels/${channelId}/moderation/rules`),
        apiRequest<{ banned_words_enabled: boolean }>(`/channels/${channelId}/banned-words/toggle`),
      ]);
      const rules = rulesData.items.map((r) => ({
        id: r.id,
        phrase: r.phrase,
        action: r.action,
        mute_duration_minutes: r.mute_duration_minutes,
      }));
      dispatch(setRules(rules));
      dispatch(setEnabled(toggleData.banned_words_enabled));
      return rules;
    } catch {
      return [];
    }
  },
);

export const toggleBannedWordsThunk = createAsyncThunk(
  'bannedWords/toggle',
  async (
    { channelId, enabled }: { channelId: number; enabled: boolean },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setEnabled(enabled));
    try {
      await apiRequest(`/channels/${channelId}/banned-words/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      return enabled;
    } catch (error) {
      dispatch(setEnabled(!enabled));
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    }
  },
);

export const addBannedWordThunk = createAsyncThunk(
  'bannedWords/add',
  async (
    { channelId }: { channelId: number },
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState() as ChannelsPageState;
    const { inputValue, action: ruleAction, muteDays, muteHours, muteMinutes } = state.bannedWords;
    const phrase = inputValue.trim();
    if (!phrase) return rejectWithValue('Введите слово');

    const totalMinutes = muteDays * 1440 + muteHours * 60 + muteMinutes;

    dispatch(setSaving(true));
    dispatch(setError(null));
    try {
      const data = await apiRequest<RuleResponse>(`/channels/${channelId}/moderation/rules`, {
        method: 'POST',
        body: JSON.stringify({
          phrase,
          action: ruleAction,
          mute_duration_minutes: ruleAction === 'MUTE' ? (totalMinutes || 1) : null,
        }),
      });
      dispatch(addRule({
        id: data.id,
        phrase: data.phrase,
        action: data.action,
        mute_duration_minutes: data.mute_duration_minutes,
      }));
      dispatch(setInputValue(''));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка добавления';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const deleteBannedWordThunk = createAsyncThunk(
  'bannedWords/delete',
  async (
    { channelId, ruleId }: { channelId: number; ruleId: number },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(removeRule(ruleId));
    dispatch(setSaving(true));
    try {
      await apiRequest(`/channels/${channelId}/moderation/rules/${ruleId}`, {
        method: 'DELETE',
      });
      return ruleId;
    } catch {
      return ruleId;
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const updateBannedWordsActionThunk = createAsyncThunk(
  'bannedWords/updateAction',
  async (
    { channelId }: { channelId: number },
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState() as ChannelsPageState;
    const { rules, action: newAction, muteDays, muteHours, muteMinutes } = state.bannedWords;
    if (rules.length === 0) return;

    const totalMinutes = muteDays * 1440 + muteHours * 60 + muteMinutes;

    dispatch(setSaving(true));
    try {
      const updated = await Promise.all(
        rules.map((rule) =>
          apiRequest<RuleResponse>(`/channels/${channelId}/moderation/rules/${rule.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              action: newAction,
              mute_duration_minutes: newAction === 'MUTE' ? (totalMinutes || 1) : null,
            }),
          }),
        ),
      );
      const newRules = updated.map((r) => ({
        id: r.id,
        phrase: r.phrase,
        action: r.action,
        mute_duration_minutes: r.mute_duration_minutes,
      }));
      dispatch(setRules(newRules));
      return newRules;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
