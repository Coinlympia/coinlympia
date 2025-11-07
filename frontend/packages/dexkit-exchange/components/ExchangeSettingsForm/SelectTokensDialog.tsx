import { Token } from "@dexkit/core/types";
import { AppDialogTitle } from "@dexkit/ui/components/AppDialogTitle";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import SelectTokenList from "./SelectTokensDialogList";

export interface SelectTokensDialogProps {
  DialogProps: DialogProps;
  tokens: Token[];
  defaultSelectedTokens: Token[];
  onConfirm: (tokens: Token[]) => void;
}

export default function SelectTokensDialog({
  DialogProps,
  tokens,
  defaultSelectedTokens,
  onConfirm,
}: SelectTokensDialogProps) {
  const { onClose } = DialogProps;

  const [selectedTokens, setSelectedTokens] = useState<{
    [key: string]: Token;
  }>({});

  const handleClose = () => {
    if (onClose) {
      onClose({}, "backdropClick");
    }
  };

  const handleSelectToken = useCallback((token: Token) => {
    setSelectedTokens((value) => {
      let newValue = { ...value };
      let key = `${token.chainId}-${token.address.toLocaleLowerCase()}`;

      if (value[key]) {
        delete newValue[key];
      } else {
        newValue[key] = token;
      }

      return newValue;
    });
  }, []);

  const handleConfirm = () => {
    onConfirm(Object.values(selectedTokens));
  };

  useEffect(() => {
    if (defaultSelectedTokens.length > 0) {
      let obj: any = {};

      for (let token of defaultSelectedTokens) {
        obj[`${token.chainId}-${token.address.toLowerCase()}`] = token;
      }

      setSelectedTokens(obj);
    }
  }, [defaultSelectedTokens]);

  return (
    <Dialog {...DialogProps}>
      <AppDialogTitle
        title={
          <FormattedMessage id="select.tokens" defaultMessage="Select tokens" />
        }
        onClose={handleClose}
      />
      <DialogContent sx={{ p: 0 }} dividers>
        <SelectTokenList
          onSelect={handleSelectToken}
          selectedTokens={selectedTokens}
          tokens={tokens}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleConfirm} variant="contained">
          <FormattedMessage id="confirm" defaultMessage="Confirm" />
        </Button>
        <Button onClick={handleClose}>
          <FormattedMessage id="cancel" defaultMessage="Cancel" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}
