export enum UserOnChainEvents {
  approve = "approve",
  swap = "swap",
  unwrap = "unwrap",
  wrap = "wrap",
  transfer = "transfer",
  nftTransferERC721 = "nftTransferERC721",
  nftTransferERC1155 = "nftTransferERC1155",
  nftBurnERC721 = "nftBurnERC721",
  nftBurnERC1155 = "nftBurnERC1155",
  nftBurnMultiple = "nftBurnMultiple",
  marketBuy = "marketBuy",
  marketSell = "marketSell",
  orderCancelled = "orderCancelled",
  cancelNFTERC721order = "cancelNFTERC721Order",
  cancelNFTERC1155order = "cancelNFTERC1155Order",
}

export enum UserOffChainEvents {
  signMessage = "signMessage",
  loginSignMessage = "loginSignMessage",
  connectAccount = "connectAccount",
  disconnectAccount = "disconnectAccount",
  postLimitOrder = "postLimitOrder",
  nftERC1155List = "nftERC1155List",
  nftERC1155Offer = "nftERC1155Offer",
  nftERC721List = "nftERC721List",
  nftERC721Offer = "nftERC721Offer",
}
export const UserEvents = {
  ...UserOnChainEvents,
  ...UserOffChainEvents,
};
