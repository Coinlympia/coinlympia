import React from "react";
import { MagicState } from "../types/magic";

export const MagicStateContext = React.createContext<MagicState>({
  showTransactionModal: false,
  showSignDataDialog: false,
  handleShowTransactionModal: () => {},
  handleCloseTransactionModal: () => {},
  handleTransactionConfirm: () => {},
  handleTransactionCancel: () => {},
  handleSignConfirm: () => {},
  handleSignCancel: () => {},
  data: {},
  signData: {},
});
