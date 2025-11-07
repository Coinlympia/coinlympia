import { TransactionStatus } from "@dexkit/core/constants/enums";
import { NETWORK_EXPLORER } from "@dexkit/core/constants/networks";
import { useDexKitContext } from "@dexkit/ui";
import { NotificationMessage } from "@dexkit/ui/components/NotificationMessage";
import { AppNotification } from "@dexkit/ui/types";
import { Done, Error } from "@mui/icons-material";
import { CircularProgress, Icon, TableCell, TableRow } from "@mui/material";
import moment from "moment";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import Link from "../../../components/AppLink";
import MomentFromNow from "../../../components/MomentFromNow";

interface Props {
  notification: AppNotification;
}

export function TransactionsTableRow({ notification }: Props) {
  const { notificationTypes, transactions } = useDexKitContext();

  const hash = useMemo(() => {
    if (
      notification.type === "transaction" &&
      notification.metadata &&
      notification.metadata["hash"]
    ) {
      return notification.metadata["hash"];
    }
  }, [transactions]);

  const transaction = useMemo(() => {
    if (hash) {
      return transactions[hash];
    }
  }, [hash]);

  return (
    <TableRow>
      <TableCell>
        <Icon>{notification.icon}</Icon>
      </TableCell>
      <TableCell>
        <NotificationMessage
          type={notification.subtype}
          types={notificationTypes}
          values={notification.values}
        />
      </TableCell>
      <TableCell>
        <MomentFromNow from={moment(new Date(notification.date))} />
      </TableCell>
      <TableCell>
        {transaction &&
          (transaction.status === TransactionStatus.Pending ? (
            <CircularProgress size="1.5rem" />
          ) : transaction.status === TransactionStatus.Confirmed ? (
            <Done fontSize="small" />
          ) : transaction.status === TransactionStatus.Failed ? (
            <Error fontSize="small" />
          ) : null)}
      </TableCell>
      <TableCell>
        <Link
          sx={{ textTransform: "uppercase", textDecoration: "none" }}
          href={`${NETWORK_EXPLORER(transaction?.chainId)}/tx/${hash}`}
          target="_blank"
        >
          <FormattedMessage id="view" defaultMessage="view" />
        </Link>
      </TableCell>
    </TableRow>
  );
}
