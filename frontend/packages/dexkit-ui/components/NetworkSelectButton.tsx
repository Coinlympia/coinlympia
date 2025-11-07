import { ChainId } from "@dexkit/core/constants";
import {
  NETWORK_IMAGE,
  NETWORK_NAME,
  NETWORK_SYMBOL,
} from "@dexkit/core/constants/networks";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import { useState } from "react";
import ChooseNetworkDialog from "./dialogs/ChooseNetworkDialog";

interface Props {
  chainId?: ChainId;
  onChange: (chainId: ChainId) => void;
}

export function NetworkSelectButton(props: Props) {
  const { onChange, chainId } = props;
  const [showSelectSwapNetworkDialog, setShowSelectSwapNetwork] =
    useState(false);

  const handleOpenSelectNetworkDialog = () => {
    setShowSelectSwapNetwork(true);
  };

  const handleCloseShowNetworkDialog = () => {
    setShowSelectSwapNetwork(false);
  };

  return (
    <>
      {showSelectSwapNetworkDialog && (
        <ChooseNetworkDialog
          dialogProps={{
            open: showSelectSwapNetworkDialog,
            fullWidth: true,
            maxWidth: "sm",
            onClose: handleCloseShowNetworkDialog,
          }}
          selectedChainId={chainId}
          onChange={(newChain) => {
            onChange(newChain);
          }}
        />
      )}

      <Button
        onClick={handleOpenSelectNetworkDialog}
        startIcon={
          <Avatar
            src={NETWORK_IMAGE(chainId)}
            sx={(theme) => ({
              width: "auto",
              height: theme.spacing(3),
            })}
            alt={NETWORK_NAME(chainId) || ""}
          />
        }
      >
        {NETWORK_SYMBOL(chainId) || ""}
      </Button>
    </>
  );
}
