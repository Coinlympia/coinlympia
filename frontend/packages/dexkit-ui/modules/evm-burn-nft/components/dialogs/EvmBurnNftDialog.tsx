import { AppDialogTitle } from "@dexkit/ui/components";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import EvmBurnNft, { EvmTransferNftProps } from "../EvmBurnNft";

export interface EvmTransferNftDialogProps {
  DialogProps: DialogProps;
  params: EvmTransferNftProps;
}

export default function EvmBurnNftDialog({
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
              id="burn.name.value"
              defaultMessage="Burn NFT {nftName}"
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
        <EvmBurnNft {...params} />
      </DialogContent>
      <DialogActions></DialogActions>
    </Dialog>
  );
}
