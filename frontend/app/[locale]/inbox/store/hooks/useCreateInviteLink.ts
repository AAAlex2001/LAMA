import { useState } from 'react';
import { useAppDispatch } from '../index';
import { createInviteLinkThunk } from '../thunks/inviteLinks';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';

export function useCreateInviteLink() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const createInviteLink = async (data: InviteLinkData) => {
    setIsLoading(true);
    try {
      return await dispatch(createInviteLinkThunk(data)).unwrap();
    } finally {
      setIsLoading(false);
    }
  };

  return { createInviteLink, isLoading };
}
