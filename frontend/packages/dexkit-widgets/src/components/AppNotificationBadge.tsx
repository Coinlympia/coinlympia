import NotificationsIcon from "@mui/icons-material/Notifications";
import { Badge } from "@mui/material";
import { useAtomValue } from "jotai";
import {
  hasPendingTransactionsAtom,
  pendingTransactionsAtom,
} from "../state/atoms";

export function AppNotificationsBadge() {
  const hasPendingTransactions = useAtomValue(hasPendingTransactionsAtom);
  const pendingTransactions = useAtomValue(pendingTransactionsAtom);

  return (
    <Badge
      variant={hasPendingTransactions ? "dot" : "standard"}
      color="primary"
      badgeContent={
        pendingTransactions.length > 0 ? pendingTransactions.length : undefined
      }
      invisible={!hasPendingTransactions && pendingTransactions.length === 0}
    >
      <NotificationsIcon />
    </Badge>
  );
}
