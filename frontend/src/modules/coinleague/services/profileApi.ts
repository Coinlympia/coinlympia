import { ChainId } from '@/modules/common/constants/enums';
import axios from 'axios';
import { ethers } from 'ethers';
import { PROFILE_API } from '../constants';
import { GameProfile } from '../types';
;
const profileaApi = axios.create({ baseURL: PROFILE_API });
export const signUpdate = async (provider: ethers.providers.Web3Provider, chainId: ChainId) => {
  const signer = provider.getSigner();

  const domain = {
    name: 'Coinleague',
    version: '1',
    chainId: chainId,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  };

  const types = {
    Message: [
      { name: 'message', type: 'string' },
      { name: 'powered', type: 'string' },
    ],
  };
  const message = {
    message: 'Create my Profile',
    powered: 'Powered By DexKit',
  };

  const messageSigned = ethers.utils._TypedDataEncoder.getPayload(
    domain,
    types,
    message
  );
  const sig = await signer._signTypedData(domain, types, message);
  return { sig, messageSigned };
};

export const create = (
  sig: string,
  message: string,
  tokenAddress: string,
  tokenId: string,
  username: string,
  account: string,
  chainId: ChainId = ChainId.Polygon,
) => {

  const data = {
    address: account,
    message: message,
    tokenAddress: tokenAddress,
    signature: sig,
    username: username,
    tokenId: tokenId,
    chainId: chainId,
  }

  return profileaApi.post('/create', data)

};

export const createUsername = (
  sig: string,
  message: string,
  username: string,
  account: string,
  chainId: ChainId = ChainId.Polygon,
) => {
  const data = {
    address: account,
    message: message,
    signature: sig,
    username: username,
    chainId: chainId,
  }
  return profileaApi.post('/create-username', data)
};

export const remove = (sig: string, message: string, account: string) => {
  const data = {
    message: message,
    signature: sig,
  };

  return profileaApi.delete(`/${account}`, { data })

};

export const getProfile = async (address: string) => {
  try {
    const response = await axios.post<{ success: boolean; profiles?: GameProfile[]; error?: string }>('/api/user/all-addresses', { addresses: [address] });
    if (response.data.success && response.data.profiles && response.data.profiles.length > 0) {
      return response.data.profiles[0];
    }
  } catch (error) {
    console.error('Error fetching profile from local API:', error);
  }
  
  return axios
    .get<GameProfile>(`${PROFILE_API}/address/${address}`)
    .then((response) => response.data)
    .catch((error) => {
      console.error('Error fetching profile from external API:', error);
      throw error;
    });
};

  /**
   *
   */
export const getProfiles = (addresses: string[]): Promise<GameProfile[]> => {
  return axios
    .post<{ success: boolean; profiles?: GameProfile[]; error?: string }>('/api/user/all-addresses', { addresses })
    .then((response) => {
      if (response.data.success && response.data.profiles) {
        return response.data.profiles;
      }
      return [];
    })
    .catch((error) => {
      console.error('Error fetching profiles from local API:', error);
      return axios
        .post<GameProfile[]>(`${PROFILE_API}/all/addresses`, { addresses })
        .then((response) => response.data)
        .catch((fallbackError) => {
          console.error('Error fetching profiles from external API:', fallbackError);
          return [];
        });
    });
};
