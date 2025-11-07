import { useAsset, useAssetMetadata } from "../hooks";
import { AssetDetailsBase } from "./AssetDetailsBase";

interface Props {
  address: string;
  id: string;
}

export function AssetDetails({ address, id }: Props) {
  const { data: asset } = useAsset(address, id);
  const { data: metadata } = useAssetMetadata(asset);

  return <AssetDetailsBase asset={asset} metadata={metadata} />;
}
