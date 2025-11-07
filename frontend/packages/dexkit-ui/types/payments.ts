export type CreditGrant = {
  id: number;
  createdAt: string;
  updatedAt: string;

  amount: string;
  account: string;
  expiresIn?: string;
  enabled: boolean;
};

export type CryptoCheckoutSession = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  txHash: string | null;
  chainId: number | null;
  sender: string | null;
  receiver: string | null;
  tokenAddress: string | null;
  metadata: any;
};
