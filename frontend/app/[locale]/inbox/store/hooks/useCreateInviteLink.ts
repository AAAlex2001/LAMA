import { useCallback, useState } from 'react';
import { useAppDispatch } from '../index';
import { createInviteLinkThunk } from '../thunks/inviteLinks';
import type { InviteLink } from '@/types';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';

export function useCreateInviteLink() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (
      data: InviteLinkData,
      options?: {
        onSuccess?: (data: InviteLink) => void;
        onError?: (error: Error) => void;
      }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await dispatch(createInviteLinkThunk(data)).unwrap();
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  return {
    mutate,
    isLoading,
    error,
  };
}
