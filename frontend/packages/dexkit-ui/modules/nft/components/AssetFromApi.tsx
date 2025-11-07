import { useAssetByApi } from "../hooks";
import { AssetCard } from "./AssetCard";

interface Props {
  chainId: number;
  contractAddress: string;
  tokenId: string;
  disabled?: boolean;
}

export default function AssetFromApi({
  chainId,
  contractAddress,
  tokenId,
  disabled,
}: Props) {
  const { data: asset } = useAssetByApi({ chainId, contractAddress, tokenId });

  return <AssetCard asset={asset} disabled={disabled} />;
}
