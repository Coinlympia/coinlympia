import { AppDialogTitle } from "@dexkit/ui/components";
import {
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { FormattedMessage } from "react-intl";

export interface SelectAddressDialogProps {
  DialogProps: DialogProps;
  addresses: string[];
  onSelect: (address: string) => void;
}

export default function SelectAddressDialog({
  DialogProps,
  addresses,
  onSelect,
}: SelectAddressDialogProps) {
  const { onClose } = DialogProps;

  const handleClose = () => {
    if (onClose) {
      onClose({}, "backdropClick");
    }
  };

  return (
    <Dialog {...DialogProps}>
      <AppDialogTitle
        title={
          <FormattedMessage
            id="Select.an.address"
            defaultMessage="Select an address"
          />
        }
        onClose={handleClose}
      />
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        <List disablePadding>
          {addresses.map((address, key) => (
            <ListItemButton onClick={() => onSelect(address)} key={key}>
              <ListItemText primary={address} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
