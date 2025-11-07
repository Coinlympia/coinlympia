import { getNetworkFromName } from "@dexkit/core/utils/blockchain";
import CollectionFromApiCard from "@dexkit/ui/modules/nft/components/CollectionFromApi";
import type { CellPlugin } from "@react-page/editor";

type Data = {
  image: string;
  name: string;
  backgroundImage: string;
  network: string;
  contractAddress: string;
  description?: string;
  uri?: string;
};

// you can pass the shape of the data as the generic type argument
const CollectionPlugin: CellPlugin<Data> = {
  Renderer: ({ data }) => (
    <CollectionFromApiCard
      chainId={getNetworkFromName(data.network)?.chainId}
      contractAddress={data.contractAddress}
      totalSupply={0}
      backgroundImageUrl={data.backgroundImage}
      title={data.name}
      variant={"simple"}
      disabled={true}
    />
  ),
  id: "collection-plugin",
  title: "Collection Banner",
  description: "Show a collection banner",
  version: 1,
};

export default CollectionPlugin;
