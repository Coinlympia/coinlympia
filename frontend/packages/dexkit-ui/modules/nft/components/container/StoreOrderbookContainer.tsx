import { StoreOrderbook } from "@dexkit/ui/modules/nft/components/StoreOrderbook";
import { useAssetsOrderBook } from "../../hooks";

type StoreOrdebookOptions = {
  search?: string;
  chainId?: number;
  collectionAddress?: string;
  storeAccount?: string;
  context?: "collection" | "store";
};

export function StoreOrdebookContainer({
  search,
  storeAccount,
  chainId,
  collectionAddress,
  context,
}: StoreOrdebookOptions) {
  const assetOrderbookQuery = useAssetsOrderBook({
    maker: storeAccount?.toLowerCase(),
    chainId: chainId,
    nftToken: collectionAddress?.toLowerCase(),
  });

  return (
    <>
      <StoreOrderbook
        context={context}
        search={search}
        orderbook={assetOrderbookQuery.data}
        isLoading={assetOrderbookQuery.isLoading}
      />
    </>
  );
}
