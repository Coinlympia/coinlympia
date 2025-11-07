import { useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useTokenData } from "../../../hooks";
import { UserEvent } from "../hooks/useUserActivity";

export interface UserActivityBuyDropCollectionProps {
  event: UserEvent;
}

export default function UserActivityBuyDropCollection({
  event,
}: UserActivityBuyDropCollectionProps) {
  const { price, token, quantity, collection } = event.processedMetadata;

  const tokenDataMutation = useTokenData();

  useEffect(() => {
    if (event.chainId) {
      tokenDataMutation.mutate({
        address: collection,
        chainId: event.chainId,
      });
    }
  }, [collection]);

  const [symbol] = useMemo(() => {
    return [
      (
        tokenDataMutation.data as {
          decimals: number;
          name: string;
          symbol: string;
        }
      )?.symbol,
    ];
  }, [tokenDataMutation.data]);

  return (
    <FormattedMessage
      id="buy.token.drop.for"
      defaultMessage="Buy Drop Collection {quantity} {symbol} for {price} {tokenSymbol}"
      values={{
        price: <strong>{price}</strong>,
        symbol: <strong>{symbol}</strong>,
        quantity,
        tokenSymbol: <strong>{token?.symbol}</strong>,
      }}
    />
  );
}
