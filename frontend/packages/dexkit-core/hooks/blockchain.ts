import { ChainId } from "../constants/enums";
import { NETWORK_PROVIDER } from "../constants/networkProvider";

export function useNetworkProvider(chainId?: ChainId) {
  return NETWORK_PROVIDER(chainId);
}
