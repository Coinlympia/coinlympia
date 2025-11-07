import { AppDialogTitle } from "@dexkit/ui/components";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import EvmTransferNft, { EvmTransferNftProps } from "../EvmTransferNft";

export interface EvmTransferNftDialogProps {
  DialogProps: DialogProps;
  params: EvmTransferNftProps;
}

export default function EvmTransferNftDialog({
  DialogProps,
  params,
}: EvmTransferNftDialogProps) {
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
              id="transfer.name.value"
              defaultMessage="Transfer NFT {nftName}"
              values={{
                nftName: params?.nftMetadata?.name
                  ? params?.nftMetadata?.name
                  : "",
              }}
            />
          </>
        }
        onClose={handleClose()}
      />
      <DialogContent dividers>
        <EvmTransferNft {...params} />
      </DialogContent>
      <DialogActions></DialogActions>
    </Dialog>
  );
}
