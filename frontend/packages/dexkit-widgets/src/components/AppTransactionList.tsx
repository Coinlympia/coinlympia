import { List } from "@mui/material";
import { Transaction } from "../types";
import AppNotificationsListItem from "./AppTransactionListItem";

interface Props {
  transactions: Transaction[];
}

export default function AppTransactionList({ transactions }: Props) {
  return (
    <List disablePadding>
      {transactions.map((transaction, index) => (
        <AppNotificationsListItem key={index} transaction={transaction} />
      ))}
    </List>
  );
}
