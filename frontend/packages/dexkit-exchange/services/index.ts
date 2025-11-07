import axios from "axios";
import { GtTopPoolsApiResponse } from "../types";

const GECKOTERMINAL_API_URL = "https://api.geckoterminal.com/api/v2";

const GEKCOTERMINAL_POOLS_ENDPOINT = (network: string, address: string) =>
  `${GECKOTERMINAL_API_URL}/networks/${network}/tokens/${address}/pools`;

export const getGeckoTerminalTopPools = async ({
  address,
  network,
}: {
  network: string;
  address: string;
}) => {
  const endpoint = GEKCOTERMINAL_POOLS_ENDPOINT(network, address);

  return await axios.get<GtTopPoolsApiResponse>(endpoint);
};
