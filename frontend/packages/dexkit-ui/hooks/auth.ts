import { useWeb3React } from "@dexkit/wallet-connectors/hooks/useWeb3React";
import { useMutation, useQuery } from "@tanstack/react-query";
import jwt_decode from "jwt-decode";
import { useContext } from "react";
import { useDexKitContext, useSignMessageDialog } from ".";
import { AuthStateContext } from "../context/AuthContext";
import axios from "axios";
import {
  getRefreshAccessToken,
  loginApp,
  logoutApp,
  requestSignature,
  setAccessToken,
} from "../services/auth";
import { useIsWidget } from "./app/useIsWidget";

export function useAuth() {
  const { setIsLoggedIn, isLoggedIn, user, setUser } =
    useContext(AuthStateContext);
  return { setIsLoggedIn, isLoggedIn, user, setUser };
}

export function useLogoutAccountMutation() {
  const { account } = useWeb3React();
  const isWidget = useIsWidget()

  const { setIsLoggedIn, setUser } = useAuth();

  return useMutation(async () => {
    if (!account) {
      return;
    }
    const accessTk = await getRefreshAccessToken({ isWidget });
    if (accessTk) {
      const logoutResponse = await logoutApp({ accessTk, isWidget });
      const data = logoutResponse.data;
      if (data.logout) {
        if (setIsLoggedIn) {
          setIsLoggedIn(false);
        }
        if (setUser) {
          setUser(undefined);
        }
        setAccessToken(undefined);
      }
      return data.logout;
    }
    throw Error("not able to logout");
  });
}

export const GET_AUTH_USER = "GET_AUTH_USER";
export function useAuthUserQuery() {
  const { account } = useWeb3React();
  return useQuery({
    queryKey: [GET_AUTH_USER, account],
    queryFn: async () => {
      if (!account) {
        return null;
      }
      try {
        const response = await axios.post<{
          success: boolean;
          user?: {
            id: string;
            address: string;
            username: string | null;
            profileImageURL: string | null;
            backgroundImageURL: string | null;
            createdAt: Date;
            updatedAt: Date;
            totalWinnedGames: number;
            totalJoinedGames: number;
            totalFirstWinnedGames: number;
            totalSecondWinnedGames: number;
            totalThirdWinnedGames: number;
            totalEarned: string;
            totalSpent: string;
            earnedMinusSpent: string;
          };
          error?: string;
        }>(`/api/user/get-by-address`, { address: account });
        
        if (response.data.success && response.data.user) {
          return {
            id: response.data.user.id,
            username: response.data.user.username,
            profileImageURL: response.data.user.profileImageURL,
            backgroundImageURL: response.data.user.backgroundImageURL,
            accounts: [{ address: response.data.user.address }],
          };
        }
        return null;
      } catch (error) {
        console.error('[useAuthUserQuery] Error getting user:', error);
        return null;
      }
    },
    enabled: !!account,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginAccountMutation() {
  const { account, provider, chainId } = useWeb3React();
  const signMessageDialog = useSignMessageDialog();
  const { siteId, affiliateReferral } = useDexKitContext();
  const isWidget = useIsWidget();
  const { signMessage } = useWeb3React();
  const { setIsLoggedIn, setUser } = useAuth();

  return useMutation(
    async () => {
      if (!account || !provider) {
        return;
      }
      signMessageDialog.setOpen(true);
      const messageToSign = await requestSignature({ address: account });

      const signature = await signMessage({
        message: messageToSign.data,
      });

      const chain = chainId;

      const loginResponse = await loginApp({
        signature,
        address: account,
        chainId: chain,
        siteId,
        referral: affiliateReferral,
        isWidget
      });
      if (setIsLoggedIn) {
        setIsLoggedIn(true);
      }

      if (setUser && loginResponse.data.access_token) {
        setUser(jwt_decode(loginResponse.data.access_token));
      }
      setAccessToken(loginResponse.data.access_token);

      return loginResponse.data;
    },
    {
      onError(error) {
        signMessageDialog.setOpen(false);
        // signMessageDialog.setError(Error('Error signing message'));
      },
      onSettled() {
        signMessageDialog.setOpen(false);
      },
    }
  );
}
