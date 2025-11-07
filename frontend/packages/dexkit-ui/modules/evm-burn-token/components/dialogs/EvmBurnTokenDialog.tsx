import { ChainId } from "@dexkit/core";
import { Token } from "@dexkit/core/types";
import { AppDialogTitle } from "@dexkit/ui/components";
import { Dialog, DialogContent, DialogProps, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import EvmBurnToken from "../EvmBurnToken";

export interface EvmBurnTokenDialogProps {
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
}: EvmBurnTokenDialogProps) {
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
              id="burn.name.value"
              defaultMessage='Burn Token "{tokenName}"'
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
        <EvmBurnToken
          account={account}
          chainId={chainId}
          token={token}
          onConnectWallet={onConnectWallet}
        />
      </DialogContent>
    </Dialog>
  );
}
