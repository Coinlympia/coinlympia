import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  styled,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import Link from "./AppLink";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";

import Wallet from "./icons/Wallet";

const CustomListItemSecondaryAction = styled(ListItemSecondaryAction)({
  display: "flex",
  alignItems: "center",
  alignContent: "center",
  justifyContent: "center",
  height: "100%",
});

export interface AppDefaultMenuListProps {
  onClose: () => void;
}

export default function AppDefaultMenuList({
  onClose,
}: AppDefaultMenuListProps) {
  return (
    <List disablePadding>
      <ListItemButton divider onClick={onClose} component={Link} href="/">
        <ListItemIcon>
          <HomeOutlinedIcon />
        </ListItemIcon>
        <ListItemText
          sx={{ fontWeight: 600 }}
          primary={<FormattedMessage id="home" defaultMessage="Home" />}
        />
        <CustomListItemSecondaryAction>
          <ChevronRightIcon color="primary" />
        </CustomListItemSecondaryAction>
      </ListItemButton>
      <ListItemButton divider onClick={onClose} component={Link} href="/swap">
        <ListItemIcon>
          <SwapVertOutlinedIcon />
        </ListItemIcon>
        <ListItemText
          sx={{ fontWeight: 600 }}
          primary={<FormattedMessage id="swap" defaultMessage="Swap" />}
        />
        <CustomListItemSecondaryAction>
          <ChevronRightIcon color="primary" />
        </CustomListItemSecondaryAction>
      </ListItemButton>
      <ListItemButton divider onClick={onClose} component={Link} href="/wallet">
        <ListItemIcon>
          <Wallet />
        </ListItemIcon>
        <ListItemText
          sx={{ fontWeight: 600 }}
          primary={<FormattedMessage id="wallet" defaultMessage="Wallet" />}
        />
        <CustomListItemSecondaryAction>
          <ChevronRightIcon color="primary" />
        </CustomListItemSecondaryAction>
      </ListItemButton>
    </List>
  );
}
