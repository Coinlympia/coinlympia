import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  List,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Radio,
  Stack,
} from "@mui/material";
import { FormattedMessage } from "react-intl";

import { useState } from "react";
import { LANGUAGES } from "../../constants";
import { useLocale } from "../../hooks";
import { Language } from "../../types/app";
import { AppDialogTitle } from "../AppDialogTitle";

interface Props {
  dialogProps: DialogProps;
}

function SelectLanguageDialog({ dialogProps }: Props) {
  const { onClose } = dialogProps;

  const { locale, onChangeLocale } = useLocale();

  const [defaultLocale] = useState(locale);

  const handleClose = () => {
    if (onClose) {
      onClose({}, "backdropClick");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose({}, "backdropClick");
    }
    onChangeLocale(defaultLocale);
  };

  const handleSelectLocale = (loc: string) => {
    onChangeLocale(loc);
  };

  const handleConfirmSelect = () => {
    onChangeLocale(locale);

    handleClose();
  };

  return (
    <Dialog {...dialogProps} onClose={handleClose}>
      <AppDialogTitle
        title={
          <FormattedMessage
            id="select.language"
            defaultMessage="Select language"
            description="Select language"
          />
        }
        onClose={handleClose}
      />
      <DialogContent dividers sx={{ p: 0 }}>
        <Stack spacing={2}>
          <List disablePadding>
            {LANGUAGES.map((c: Language, index: number) => (
              <ListItemButton
                onClick={() => handleSelectLocale(c.locale)}
                selected={c.locale === locale}
                key={index}
              >
                <ListItemText primary={c.name} />
                <ListItemSecondaryAction>
                  <Radio checked={c.locale === locale} />
                </ListItemSecondaryAction>
              </ListItemButton>
            ))}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmSelect}
        >
          <FormattedMessage
            id="confirm"
            defaultMessage="Confirm"
            description="Confirm"
          />
        </Button>
        <Button onClick={handleCancel}>
          <FormattedMessage
            id="cancel"
            defaultMessage="Cancel"
            description="Cancel"
          />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SelectLanguageDialog;
