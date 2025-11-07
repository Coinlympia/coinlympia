import { getChainName } from "@dexkit/core/utils/blockchain";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { FormattedMessage } from "react-intl";
import { useSwitchNetworkMutation } from "../hooks";

interface Props {
  desiredChainId?: number;
}

export function SwitchNetworkButton({ desiredChainId }: Props) {
  const switchNetworkMutation = useSwitchNetworkMutation();

  return (
    <Button
      disabled={switchNetworkMutation.isLoading}
      size="large"
      variant="contained"
      startIcon={
        switchNetworkMutation.isLoading ? (
          <CircularProgress color="inherit" size="1rem" />
        ) : null
      }
      onClick={async () => {
        if (desiredChainId) {
          switchNetworkMutation.mutateAsync({ chainId: desiredChainId });
        }
      }}
    >
      <FormattedMessage
        id="switch.to.network"
        defaultMessage="Switch to {network}"
        values={{ network: getChainName(desiredChainId) }}
      />
    </Button>
  );
}
