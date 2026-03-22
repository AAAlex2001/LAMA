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
      const data = await apiRequest<RulesListResponse>(`/channels/${channelId}/moderation/rules`);
      const rules = data.items.map((r) => ({
        id: r.id,
        phrase: r.phrase,
        action: r.action,
        mute_duration_minutes: r.mute_duration_minutes,
      }));
      dispatch(setRules(rules));
      dispatch(setEnabled(rules.length > 0));
      return rules;
    } catch {
      return [];
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
    const { inputValue, muteDays, muteHours, muteMinutes } = state.bannedWords;
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
          action: 'MUTE',
          mute_duration_minutes: totalMinutes || 1,
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
    dispatch(setSaving(true));
    try {
      await apiRequest(`/channels/${channelId}/moderation/rules/${ruleId}`, {
        method: 'DELETE',
      });
      dispatch(removeRule(ruleId));
      return ruleId;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
