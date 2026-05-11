import { useCreateInviteLinkMutation } from '@/store/inbox';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';

export function useCreateInviteLink() {
  const mutation = useCreateInviteLinkMutation();

  const createInviteLink = async (data: InviteLinkData) => {
    const channelId = parseInt(data.channelId, 10);
    if (isNaN(channelId)) throw new Error('Invalid channel ID');

    let expireDate: string | undefined;
    if (data.validityPeriod === 'date' && data.expirationDate) {
      const dt = new Date(data.expirationDate);
      dt.setHours(data.expirationHours || 0);
      dt.setMinutes(data.expirationMinutes || 0);
      dt.setSeconds(0);
      dt.setMilliseconds(0);
      expireDate = dt.toISOString();
    }

    const protectionType = data.connectionMethod === 'hasCaptcha' ? 'captcha' : 'none';
    const entryMethod = data.linkType === 'closed'
      ? data.applicationMethod || 'direct'
      : data.loginMethod || 'direct';

    return mutation.mutateAsync({
      channelId,
      data: {
        name: data.linkName || '',
        expire_date: expireDate || null,
        member_limit: data.hasLimit && data.limitCount ? data.limitCount : 0,
        creates_join_request: data.linkType === 'closed',
        protection_type: protectionType,
        entry_method: entryMethod,
      },
    });
  };

  return { createInviteLink, isLoading: mutation.isPending };
}
