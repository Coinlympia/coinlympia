import { Error } from "@mui/icons-material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import {
  Avatar,
  CircularProgress,
  Icon,
  Link,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import moment from "moment";
import { TransactionStatus } from "../constants/enum";
import { Transaction } from "../types";
import { getBlockExplorerUrl } from "../utils";
import MomentSpan from "./MomentSpan";

interface Props {
  transaction: Transaction;
}

export default function AppTransactionListItem({ transaction }: Props) {
  return (
    <ListItemButton
      divider
      component={Link}
      target="_blank"
      href={`${getBlockExplorerUrl(transaction.chainId)}/tx/${
        transaction.hash
      }`}
    >
      <ListItemAvatar>
        <Avatar>
          <Icon color="action">{transaction.icon}</Icon>
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography>{transaction.title}</Typography>}
        secondaryTypographyProps={{ component: "div" }}
        primaryTypographyProps={{
          component: "div",
        }}
        secondary={
          <Stack>
            <Stack spacing={0.5} direction="row" alignItems="center">
              {!transaction.checked && (
                <FiberManualRecordIcon fontSize="small" color="primary" />
              )}
              <MomentSpan from={moment(new Date(transaction.created))} />
            </Stack>
          </Stack>
        }
      />
      <ListItemSecondaryAction
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          alignContent: "center",
        }}
      >
        {transaction.status === TransactionStatus.Pending ? (
          <CircularProgress size="1.5rem" />
        ) : transaction.status === TransactionStatus.Confirmed ? (
          <CheckCircleIcon />
        ) : transaction.status === TransactionStatus.Failed ? (
          <Error />
        ) : null}
      </ListItemSecondaryAction>
    </ListItemButton>
  );
}
