import { useAsset, useAssetMetadata } from "../hooks";

import { NextSeo } from "next-seo";

interface Props {
  address: string;
  id: string;
}

export function AssetHead({ address, id }: Props) {
  const { data: asset } = useAsset(address, id);

  const { data: metadata } = useAssetMetadata(asset);

  const name = metadata?.name ? `- ${metadata?.name}` : " ";

  return (
    <NextSeo
      title={`${asset?.collectionName} ${name}`}
      description={metadata?.description}
    />
  );
}

export default AssetHead;
