import { ChainId } from "@dexkit/core";
import { Token } from "@dexkit/core/types";
import { AppDialogTitle } from "@dexkit/ui/components";
import { Dialog, DialogContent, DialogProps, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import EvmApproveToken from "../EvmApproveToken";

export interface EvmApproveTokenDialogProps {
  DialogProps: DialogProps;
  token?: Token;
  account?: string;
  isRevoke?: boolean;
  chainId?: ChainId;
  showSpenderField?: boolean;
  spender?: string;
  onConnectWallet?: () => void;
}

export default function EvmApproveTokenDialog({
  DialogProps,
  token,
  account,
  chainId,
  spender,
  isRevoke,
  showSpenderField,
  onConnectWallet,
}: EvmApproveTokenDialogProps) {
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
          isRevoke ? (
            <FormattedMessage
              id="revoke.name.value"
              defaultMessage="Revoke Token {tokenName} allowance"
              values={{
                tokenName: token?.name,
              }}
            />
          ) : (
            <>
              <FormattedMessage
                id="approve.name.value"
                defaultMessage="Approve Token {tokenName} allowance"
                values={{
                  tokenName: token?.name,
                }}
              />
            </>
          )
        }
        onClose={handleClose()}
      />
      <Divider />
      <DialogContent>
        <EvmApproveToken
          account={account}
          chainId={chainId}
          token={token}
          isRevoke={isRevoke}
          showSpenderField={showSpenderField}
          spender={spender}
          onConnectWallet={onConnectWallet}
        />
      </DialogContent>
    </Dialog>
  );
}
