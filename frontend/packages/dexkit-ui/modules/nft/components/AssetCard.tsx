import { Asset } from "@dexkit/core/types/nft";
import { useAssetMetadata } from "../hooks";

import { BaseAssetCard } from "./BaseAssetCard";

interface Props {
  asset?: Asset;
  onFavorite?: (asset: Asset) => void;
  isFavorite?: boolean;
  onHide?: (asset: Asset) => void;
  onTransfer?: (asset: Asset) => void;
  isHidden?: boolean;
  showControls?: boolean;
  lazyLoadMetadata?: boolean;
  disabled?: boolean;
}

export function AssetCard({
  asset,
  onFavorite,
  isFavorite,
  onHide,
  isHidden,
  showControls,
  lazyLoadMetadata,
  disabled,
  onTransfer,
}: Props) {
  const { data: metadata } = useAssetMetadata(asset, {
    enabled: lazyLoadMetadata,
  });
  return (
    <BaseAssetCard
      onFavorite={onFavorite}
      isFavorite={isFavorite}
      disabled={disabled}
      asset={asset}
      onTransfer={onTransfer}
      onHide={onHide}
      isHidden={isHidden}
      showControls={showControls}
      assetMetadata={metadata}
    />
  );
}
