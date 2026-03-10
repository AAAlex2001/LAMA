import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { createInviteLinkThunk } from '../thunks/inviteLinks';
import type { InviteLink } from '@/types';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';

export function useCreateInviteLink() {
  const dispatch = useAppDispatch();

  const mutation = useMutation({
    mutationFn: async (data: InviteLinkData) => {
      return await dispatch(createInviteLinkThunk(data)).unwrap();
    },
  });

  const mutate = async (
    data: InviteLinkData,
    options?: {
      onSuccess?: (data: InviteLink) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    try {
      const result = await mutation.mutateAsync(data);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      options?.onError?.(error);
      throw error;
    }
  };

  return {
    mutate,
    isLoading: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
