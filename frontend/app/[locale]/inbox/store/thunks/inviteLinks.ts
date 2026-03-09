import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { InviteLink, InviteLinksResponse } from '@/types';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';
import {
  addInviteLink,
  setInviteLinksLoading,
  setInviteLinks,
  updateInviteLink,
  removeInviteLink,
} from '../slices/inbox';

export const createInviteLinkThunk = createAsyncThunk(
  'inviteLinks/createInviteLink',
  async (data: InviteLinkData, { dispatch, rejectWithValue }) => {
    const channelId = parseInt(data.channelId, 10);
    if (isNaN(channelId)) {
      return rejectWithValue('Invalid channel ID');
    }

    dispatch(setInviteLinksLoading({ channelId, loading: true }));

    try {
      let expireDate: string | undefined;
      if (data.validityPeriod === 'date' && data.expirationDate) {
        const expirationDateTime = new Date(data.expirationDate);
        expirationDateTime.setHours(data.expirationHours || 0);
        expirationDateTime.setMinutes(data.expirationMinutes || 0);
        expirationDateTime.setSeconds(0);
        expirationDateTime.setMilliseconds(0);
        expireDate = expirationDateTime.toISOString();
      }

      const protectionType = data.hasCaptcha || data.connectionMethod === 'protection' ? 'captcha' : 'none';
      const entryMethod = data.linkType === 'closed'
        ? (data.applicationMethod || 'direct')
        : (data.loginMethod || 'direct');

      const requestBody = {
        name: data.linkName || '',
        expire_date: expireDate || null,
        member_limit: data.hasLimit && data.limitCount ? data.limitCount : 0,
        creates_join_request: data.linkType === 'closed',
        protection_type: protectionType,
        entry_method: entryMethod,
      };

      const inviteLink = await apiRequest<InviteLink>(
        `/channels/${channelId}/invite-links`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      dispatch(addInviteLink({ channelId, inviteLink }));
      return inviteLink;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invite link';
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setInviteLinksLoading({ channelId, loading: false }));
    }
  }
);

export const fetchInviteLinksThunk = createAsyncThunk(
  'inviteLinks/fetchInviteLinks',
  async (channelId: number, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as { inbox: { inviteLinksLoading: Record<number, boolean> } };
    
    if (state.inbox.inviteLinksLoading[channelId]) {
      return;
    }

    dispatch(setInviteLinksLoading({ channelId, loading: true }));

    try {
      const response = await apiRequest<InviteLinksResponse>(
        `/channels/${channelId}/invite-links`,
        { method: 'GET' }
      );

      const inviteLinks = response.items || [];
      const total = response.total || 0;

      dispatch(setInviteLinks({ channelId, inviteLinks, total }));
      return { channelId, inviteLinks, total };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invite links';
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setInviteLinksLoading({ channelId, loading: false }));
    }
  }
);

export const fetchAllInviteLinksThunk = createAsyncThunk(
  'inviteLinks/fetchAllInviteLinks',
  async (_, { dispatch, getState }) => {
    const state = getState() as { 
      channels: { channels: Array<{ id: number }> };
      inbox: { inviteLinksLoading: Record<number, boolean> };
    };
    
    const channelIds = state.channels.channels.map(ch => ch.id);
    
    if (channelIds.length === 0) {
      return;
    }

    const promises = channelIds.map(async (channelId) => {
      if (state.inbox.inviteLinksLoading[channelId]) {
        return null;
      }

      dispatch(setInviteLinksLoading({ channelId, loading: true }));

      try {
        const response = await apiRequest<InviteLinksResponse>(
          `/channels/${channelId}/invite-links`,
          { method: 'GET' }
        );

        const inviteLinks = response.items || [];
        const total = response.total || 0;

        dispatch(setInviteLinks({ channelId, inviteLinks, total }));
        return { channelId, inviteLinks, total };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invite links';
        console.error(`Failed to fetch invite links for channel ${channelId}:`, errorMessage);
        return null;
      } finally {
        dispatch(setInviteLinksLoading({ channelId, loading: false }));
      }
    });

    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
    
    return successfulResults;
  }
);

export interface PatchInviteLinkRequest {
  name?: string;
  expire_date?: string | null;
  member_limit?: number;
  creates_join_request?: boolean;
  protection_type?: 'none' | 'captcha';
  entry_method?: 'direct' | 'bot';
}

export const patchInviteLinkThunk = createAsyncThunk(
  'inviteLinks/patchInviteLink',
  async (
    data: { 
      channelId: number; 
      inviteLinkId: number; 
      patchData: PatchInviteLinkRequest;
    }, 
    { dispatch, rejectWithValue }
  ) => {
    const { channelId, inviteLinkId, patchData } = data;
    
    if (isNaN(channelId) || isNaN(inviteLinkId)) {
      return rejectWithValue('Invalid channel ID or invite link ID');
    }

    dispatch(setInviteLinksLoading({ channelId, loading: true }));

    try {
      const requestBody: PatchInviteLinkRequest = {};
      
      if (patchData.name !== undefined) {
        requestBody.name = patchData.name;
      }
      if (patchData.expire_date !== undefined) {
        requestBody.expire_date = patchData.expire_date;
      }
      if (patchData.member_limit !== undefined) {
        requestBody.member_limit = patchData.member_limit;
      }
      if (patchData.creates_join_request !== undefined) {
        requestBody.creates_join_request = patchData.creates_join_request;
      }
      if (patchData.protection_type !== undefined) {
        requestBody.protection_type = patchData.protection_type;
      }
      if (patchData.entry_method !== undefined) {
        requestBody.entry_method = patchData.entry_method;
      }

      const updatedInviteLink = await apiRequest<InviteLink>(
        `/channels/${channelId}/invite-links/${inviteLinkId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      dispatch(updateInviteLink({ channelId, inviteLinkId, inviteLink: updatedInviteLink }));
      return updatedInviteLink;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update invite link';
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setInviteLinksLoading({ channelId, loading: false }));
    }
  }
);

export const fetchInviteLinkByIdThunk = createAsyncThunk(
  'inviteLinks/fetchInviteLinkById',
  async (
    { channelId, linkId }: { channelId: number; linkId: number },
    { rejectWithValue }
  ) => {
    if (isNaN(channelId) || isNaN(linkId)) {
      return rejectWithValue('Invalid channel ID or invite link ID');
    }

    try {
      const inviteLink = await apiRequest<InviteLink>(
        `/channels/${channelId}/invite-links/${linkId}`,
        { method: 'GET' }
      );

      return inviteLink;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invite link';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteInviteLinkThunk = createAsyncThunk(
  'inviteLinks/deleteInviteLink',
  async (
    { channelId, linkId }: { channelId: number; linkId: number },
    { dispatch, rejectWithValue }
  ) => {
    if (isNaN(channelId) || isNaN(linkId)) {
      return rejectWithValue('Invalid channel ID or invite link ID');
    }

    dispatch(setInviteLinksLoading({ channelId, loading: true }));

    try {
      await apiRequest(
        `/channels/${channelId}/invite-links/${linkId}`,
        { method: 'DELETE' }
      );

      dispatch(removeInviteLink({ channelId, inviteLinkId: linkId }));
      return { channelId, linkId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete invite link';
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setInviteLinksLoading({ channelId, loading: false }));
    }
  }
);