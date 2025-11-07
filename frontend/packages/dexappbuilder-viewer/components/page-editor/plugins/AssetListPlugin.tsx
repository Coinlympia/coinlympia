import { getNetworkFromName } from "@dexkit/core/utils/blockchain";
import { AssetList } from "@dexkit/ui/modules/nft/components/AssetListOrderbook";
import type { CellPlugin } from "@react-page/editor";

type Data = {
  network: string;
  contractAddress: string;
};
// you can pass the shape of the data as the generic type argument
const AssetListPlugin: CellPlugin<Data> = {
  Renderer: ({ data }) => (
    <AssetList
      contractAddress={data.contractAddress}
      chainId={getNetworkFromName(data.network)?.chainId}
    />
  ),
  id: "nft-list-plugin",
  title: "NFT List",
  description: "Show a list of nfts with orders on orderbook",
  version: 1,
};

export default AssetListPlugin;
