import {
  Box,
  Dialog,
  DialogContent,
  DialogProps,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { MIN_KIT_HOLDING_AI_GENERATION } from "../../constants";
import { AppDialogTitle } from "../AppDialogTitle";

interface Props {
  dialogProps: DialogProps;
}

export function HoldingKitDialog({ dialogProps }: Props) {
  const handleClose = () => {
    if (dialogProps.onClose) {
      dialogProps.onClose({}, "backdropClick");
    }
  };

  return (
    <Dialog {...dialogProps}>
      <AppDialogTitle
        title={<FormattedMessage id="hold.kit" defaultMessage="Hold KIT" />}
        onClose={handleClose}
      />
      <DialogContent>
        <Stack spacing={2} justifyContent="center" alignItems="center">
          <Box>
            <Typography variant="h5">
              <FormattedMessage
                defaultMessage="Not enough KIT"
                id="not.enough.kit"
              />
            </Typography>
          </Box>
          <Typography variant="body1">
            <FormattedMessage
              defaultMessage="You need to hold {value} KIT on one of these networks: BSC, ETH, or Polygon to use this feature"
              id="you.need.to.hold.kit.value"
              values={{
                value: MIN_KIT_HOLDING_AI_GENERATION,
              }}
            />
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default HoldingKitDialog;
