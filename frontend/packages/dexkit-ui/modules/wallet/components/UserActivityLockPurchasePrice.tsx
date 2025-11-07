import { NETWORKS } from "@dexkit/core/constants/networks";
import { getBlockExplorerUrl } from "@dexkit/core/utils";
import { useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import Link from "../../../components/AppLink";
import { useTokenData } from "../../../hooks";
import { UserEvent } from "../hooks/useUserActivity";

export interface UserActivityLockPurchasePriceProps {
  event: UserEvent;
}

export default function UserActivityLockPurchasePrice({
  event,
}: UserActivityLockPurchasePriceProps) {
  const { lockAddress, keyPrice, lockName, currency } = event.processedMetadata;

  const tokenDataMutation = useTokenData();

  useEffect(() => {
    if (currency !== null && event.chainId) {
      tokenDataMutation.mutate({
        address: currency,
        chainId: event.chainId,
      });
    }
  }, [currency]);

  const [symbol] = useMemo(() => {
    if (currency === null && event.chainId) {
      return [NETWORKS[event.chainId].coinSymbol];
    } else {
      return [(tokenDataMutation.data as any)?.symbol];
    }
  }, [currency, tokenDataMutation.data]);

  return (
    <FormattedMessage
      id="purchase.key.price"
      defaultMessage="Purcahse Key {lockName} for {price} {symbol} "
      values={{
        lockName: (
          <strong>
            <Link
              href={`${
                event.chainId ? getBlockExplorerUrl(event?.chainId) : ""
              }/address/${lockAddress}`}
            >
              {lockName}
            </Link>
          </strong>
        ),
        price: keyPrice,
        symbol,
      }}
    />
  );
}
