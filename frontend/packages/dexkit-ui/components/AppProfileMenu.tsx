import Edit from "@mui/icons-material/Edit";
import Person from "@mui/icons-material/Person";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useRouter } from "next/router";
import { FormattedMessage } from "react-intl";
import { useAuthUserQuery } from "../hooks/auth";

export interface AppProfileMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export default function AppProfileMenu({
  open,
  anchorEl,
  onClose,
}: AppProfileMenuProps) {
  const userQuery = useAuthUserQuery();
  const user = userQuery.data;

  const router = useRouter();

  const handleClose = () => {
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      <MenuItem
        onClick={() =>
          user ? router.push(`/u/${user.username}`) : router.push(`/u/login`)
        }
      >
        <ListItemIcon>
          <Person fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={
            <FormattedMessage id="view.profile" defaultMessage="View profile" />
          }
        />
      </MenuItem>
      {user && (
        <MenuItem onClick={() => router.push(`/u/edit`)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <FormattedMessage id="edit.profile" defaultMessage="Edit profile" />
        </MenuItem>
      )}
    </Menu>
  );
}
