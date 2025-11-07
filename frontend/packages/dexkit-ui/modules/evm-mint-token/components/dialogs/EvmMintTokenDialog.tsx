import { ChainId } from "@dexkit/core";
import { Token } from "@dexkit/core/types";
import { AppDialogTitle } from "@dexkit/ui/components";
import { Dialog, DialogContent, DialogProps, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import EvmMintToken from "../EvmMintToken";

export interface EvmMintTokenDialogProps {
  DialogProps: DialogProps;
  token?: Token;
  account?: string;
  chainId?: ChainId;
  onConnectWallet?: () => void;
}

export default function EvmBurnTokenDialog({
  DialogProps,
  token,
  account,
  chainId,
  onConnectWallet,
}: EvmMintTokenDialogProps) {
  const { onClose } = DialogProps;

  const handleClose = (cb?: () => void) => {
    return () => {
      if (cb) {
        cb();
      }
      if (onClose) {
        onClose({}, "backdropClick");
      }
    };
  };

  return (
    <Dialog {...DialogProps}>
      <AppDialogTitle
        title={
          <>
            <FormattedMessage
              id="mint.token.value"
              defaultMessage='Mint token "{tokenName}"'
              values={{
                tokenName: token?.name,
              }}
            />
          </>
        }
        onClose={handleClose()}
      />
      <Divider />
      <DialogContent>
        <EvmMintToken
          account={account}
          chainId={chainId}
          token={token}
          onConnectWallet={onConnectWallet}
        />
      </DialogContent>
    </Dialog>
  );
}
