import { getNetworkFromName } from "@dexkit/core/utils/blockchain";
import AssetFromApi from "@dexkit/ui/modules/nft/components/AssetFromApi";
import Box from "@mui/material/Box";
import type { CellPlugin } from "@react-page/editor";

type Data = {
  network: string;
  contractAddress: string;
  id: string;
};
// you can pass the shape of the data as the generic type argument
const AssetPlugin: CellPlugin<Data> = {
  Renderer: ({ data }) => {
    return (
      <Box
        sx={{
          maxWidth: 400,
        }}
      >
        <AssetFromApi
          tokenId={String(data.id)}
          contractAddress={data.contractAddress}
          chainId={getNetworkFromName(data.network)?.chainId as number}
        />
      </Box>
    );
  },
  id: "nft-plugin",
  title: "NFT",
  description: "Show a single nft",
  version: 1,
};

export default AssetPlugin;
