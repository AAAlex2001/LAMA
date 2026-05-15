import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { InviteLink, InviteLinksResponse } from '@/types';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export const inviteLinksKeys = {
  all: ['invite-links'] as const,
  byChannel: (channelId: number) => [...inviteLinksKeys.all, 'channel', channelId] as const,
  detail: (channelId: number, linkId: number) =>
    [...inviteLinksKeys.all, 'channel', channelId, 'link', linkId] as const,
};

async function fetchInviteLinks(channelId: number): Promise<InviteLinksResponse> {
  return apiRequest<InviteLinksResponse>(`/channels/${channelId}/invite-links`);
}

export function useInviteLinksQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId ? inviteLinksKeys.byChannel(channelId) : ['invite-links', 'disabled'],
    queryFn: () => fetchInviteLinks(channelId as number),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useInviteLinksBatchQuery(channelIds: number[]) {
  return useQueries({
    queries: channelIds.map((channelId) => ({
      queryKey: inviteLinksKeys.byChannel(channelId),
      queryFn: () => fetchInviteLinks(channelId),
      staleTime: 60 * 1000,
    })),
  });
}

export function useInviteLinkByIdQuery(channelId: number | null, linkId: number | null) {
  return useQuery({
    queryKey: channelId !== null && linkId !== null
      ? inviteLinksKeys.detail(channelId, linkId)
      : ['invite-links', 'disabled'],
    queryFn: () =>
      apiRequest<InviteLink>(`/channels/${channelId}/invite-links/${linkId}`),
    enabled: channelId !== null && linkId !== null,
    staleTime: 60 * 1000,
  });
}

export interface CreateInviteLinkRequest {
  name?: string;
  expire_date?: string | null;
  member_limit?: number;
  creates_join_request?: boolean;
  protection_type?: 'none' | 'captcha' | 'admin';
  entry_method?: 'direct' | 'bot';
}

export function useCreateInviteLinkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: CreateInviteLinkRequest }) =>
      apiRequest<InviteLink>(`/channels/${channelId}/invite-links`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: inviteLinksKeys.byChannel(channelId) }),
  });
}

export type PatchInviteLinkRequest = CreateInviteLinkRequest;

export function usePatchInviteLinkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId, linkId, data,
    }: { channelId: number; linkId: number; data: PatchInviteLinkRequest }) =>
      apiRequest<InviteLink>(`/channels/${channelId}/invite-links/${linkId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: inviteLinksKeys.byChannel(channelId) }),
  });
}

export function useDeleteInviteLinkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, linkId }: { channelId: number; linkId: number }) =>
      apiRequest(`/channels/${channelId}/invite-links/${linkId}`, { method: 'DELETE' }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: inviteLinksKeys.byChannel(channelId) }),
  });
}

export function invalidateInviteLinks(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: inviteLinksKeys.all });
}
