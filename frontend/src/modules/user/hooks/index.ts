import { UserOptions } from '@dexkit/ui/types/ai';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { useAuth, useLoginAccountMutation } from '@dexkit/ui/hooks/auth';
import { useSiteId } from 'src/hooks/app';
import {
  getClaimCampaign,
  getUserAddAccountMessage,
  getUserByUsername,
  getUserConnectDiscord,
  getUserConnectTwitter,
  postUserAddAccount,
  postUserRemoveAccount,
  upsertUser,
  getUserByAddressFromDB,
  getUserByUsernameFromDB,
  updateUserInDB,
} from '../services';

export function useClaimCampaignMutation({
  onSuccess,
}: {
  onSuccess?: ({ txHash }: { txHash: string }) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation(
    async () => {
      const response = await axios.post<{ txHash: string }>(
        `/api/airdrop/websummit`,
        undefined,
        { withCredentials: true },
      );

      return response.data;
    },
    {
      onSuccess(data) {
        if (onSuccess) {
          onSuccess(data);
        }

        queryClient.refetchQueries({ queryKey: [GET_USER_CLAIM_CAMPAIGN_QUERY] });
      },
    },
  );
}

export const GET_USER_CLAIM_CAMPAIGN_QUERY = 'GET_USER_CLAIM_CAMPAIGN_QUERY';

export function useUserClaimCampaignQuery() {
  const { account } = useWeb3React();
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: [GET_USER_CLAIM_CAMPAIGN_QUERY, account, isLoggedIn],
    queryFn: async () => {
      if (!account) {
        return;
      }
      if (!isLoggedIn) {
        return;
      }
      const { data } = await getClaimCampaign();
      return data;
    },
  });
}

export function useAddAccountUserMutation() {
  const { account, provider, signMessage } = useWeb3React();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  return useMutation(async () => {
    if (!provider || !account) {
      return;
    }
    if (!isLoggedIn) {
      return;
    }
    const messageToSign = await getUserAddAccountMessage({ address: account });
    const signature = await signMessage({
      message: messageToSign.data,
    });
    const user = await postUserAddAccount({ signature, address: account });
    queryClient.refetchQueries({ queryKey: [GET_AUTH_USER] });
    return user;
  });
}

export function useRemoveAccountUserMutation() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  return useMutation(async (account?: string) => {
    if (!isLoggedIn || !account) {
      return;
    }
    const user = await postUserRemoveAccount({ address: account });
    queryClient.refetchQueries({ queryKey: [GET_AUTH_USER] });
    return user;
  });
}

export function useUpsertUserMutation() {
  const { isLoggedIn } = useAuth();
  const siteId = useSiteId();
  const loginMutation = useLoginAccountMutation();
  return useMutation(async (user?: UserOptions) => {
    if (!user) {
      return;
    }
    if (!isLoggedIn) {
      await loginMutation.mutateAsync();
    }
    await upsertUser({ ...user, createdOnSiteId: siteId });
  });
}

export function useUserConnectTwitterMutation() {
  const { isLoggedIn } = useAuth();
  const loginMutation = useLoginAccountMutation();
  return useMutation(async () => {
    if (!isLoggedIn) {
      await loginMutation.mutateAsync();
    }

    await getUserConnectTwitter();
  });
}

export function useUserConnectDiscordMutation() {
  const { isLoggedIn } = useAuth();
  const loginMutation = useLoginAccountMutation();
  return useMutation(async () => {
    if (!isLoggedIn) {
      await loginMutation.mutateAsync();
    }
    await getUserConnectDiscord();
  });
}

export const GET_USER_BY_USERNAME_QUERY = 'GET_USER_BY_USERNAME_QUERY';

export function useUserQuery(username?: string) {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: [GET_USER_BY_USERNAME_QUERY, username, isLoggedIn],
    queryFn: async () => {
      if (username) {
        const userRequest = await getUserByUsername(username);
        return userRequest.data;
      }
      return null;
    },
  });
}

export const GET_AUTH_USER = 'GET_AUTH_USER';
export function useAuthUserQuery() {
  const { account } = useWeb3React();
  return useQuery({
    queryKey: [GET_AUTH_USER, account],
    queryFn: async () => {
      if (account) {
        const response = await getUserByAddressFromDB(account);
        if (response.data.success && response.data.user) {
          return {
            id: response.data.user.id,
            username: response.data.user.username,
            profileImageURL: response.data.user.profileImageURL,
            backgroundImageURL: response.data.user.backgroundImageURL,
            accounts: [{ address: response.data.user.address }],
            credentials: [],
          };
        }
        return null;
      }
      return null;
    },
    enabled: !!account,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export const GET_USER_BY_ADDRESS_DB_QUERY = 'GET_USER_BY_ADDRESS_DB_QUERY';
export function useUserByAddressQuery(address?: string) {
  return useQuery({
    queryKey: [GET_USER_BY_ADDRESS_DB_QUERY, address],
    queryFn: async () => {
      if (address) {
        const response = await getUserByAddressFromDB(address);
        if (response.data.success && response.data.user) {
          return response.data.user;
        }
        return null;
      }
      return null;
    },
    enabled: !!address,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export const GET_USER_BY_USERNAME_DB_QUERY = 'GET_USER_BY_USERNAME_DB_QUERY';
export function useUserByUsernameQueryDB(username?: string) {
  return useQuery({
    queryKey: [GET_USER_BY_USERNAME_DB_QUERY, username],
    queryFn: async () => {
      if (username) {
        const response = await getUserByUsernameFromDB(username);
        if (response.data.success && response.data.user) {
          return response.data.user;
        }
        return null;
      }
      return null;
    },
    enabled: !!username,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateUserMutation() {
  const { account } = useWeb3React();
  const queryClient = useQueryClient();
  return useMutation(
    async (data: { username?: string; profileImageURL?: string; backgroundImageURL?: string }) => {
      if (!account) {
        throw new Error('Account is required');
      }
      const response = await updateUserInDB({
        address: account,
        ...data,
      });
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      throw new Error(response.data.error || 'Failed to update user');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_USER_BY_ADDRESS_DB_QUERY] });
        queryClient.invalidateQueries({ queryKey: [GET_USER_BY_USERNAME_DB_QUERY] });
        queryClient.invalidateQueries({ queryKey: [GET_AUTH_USER] });
      },
    }
  );
}
