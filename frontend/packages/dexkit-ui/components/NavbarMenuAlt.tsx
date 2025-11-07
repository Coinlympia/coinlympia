import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Icon,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import * as React from "react";
import { FormattedMessage } from "react-intl";

import Link from "./AppLink";

import LaunchIcon from "@mui/icons-material/Launch";
import { MenuTree } from "../modules/wizard/types/config";

export interface NavbarMenuAltProps {
  menu: MenuTree;
  isPreview?: boolean;
  anchor?: HTMLElement | null;
  child?: boolean;
  ref?: (ref: HTMLElement | null) => void;
}

export interface MenuItemProps {
  item: MenuTree;
}

export function MenuItem({ item }: MenuItemProps) {
  const menuRef = React.useRef<HTMLElement | null>(null);

  return (
    <NavbarMenuAlt
      ref={(ref) => (menuRef.current = ref)}
      menu={item}
      anchor={menuRef.current}
      child
    />
  );
}

export default function NavbarMenuAlt(props: NavbarMenuAltProps) {
  const { menu, isPreview, anchor, child } = props;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const renderMenu = (item: MenuTree, key: number) => {
    if (item.type === "Page") {
      return (
        <ListItemButton
          dense
          key={key}
          disabled={isPreview}
          LinkComponent={Link}
          href={item.href || ""}
        >
          {item.data?.iconName && (
            <ListItemIcon>
              <Icon>{item.data?.iconName}</Icon>
            </ListItemIcon>
          )}
          <ListItemText primary={item.name} />
        </ListItemButton>
      );
    }

    if (item.type === "External") {
      return (
        <ListItemButton
          dense
          key={key}
          target="_blank"
          disabled={isPreview}
          LinkComponent={Link}
          href={item.href || ""}
        >
          <LaunchIcon fontSize="inherit" sx={{ mr: 2 }} />
          <ListItemText primary={item.name} />
        </ListItemButton>
      );
    }

    if (item.type === "Menu" && item.children) {
      return <MenuItem item={item} />;
    }
  };

  return (
    <>
      {child ? (
        <ListItemButton
          dense
          aria-controls={open ? "navbar-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClick}
        >
          {menu.data?.iconName && (
            <ListItemIcon>
              <Icon>{menu.data?.iconName}</Icon>
            </ListItemIcon>
          )}
          <ListItemText primary={menu.name} />
          <ExpandMoreIcon />
        </ListItemButton>
      ) : (
        <Button
          id="navbar-menu"
          aria-controls={open ? "navbar-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{
            fontWeight: 600,
            textDecoration: "none",
            color: "text.primary",
            textTransform: "none",
            fontSize: "inherit",
          }}
          startIcon={
            menu.data?.iconName ? <Icon>{menu.data?.iconName}</Icon> : undefined
          }
          endIcon={<ExpandMoreIcon />}
          onClick={handleClick}
        >
          <FormattedMessage
            id={menu.name.toLowerCase()}
            defaultMessage={menu.name}
          />
        </Button>
      )}

      <Menu
        id="navbar-menu"
        anchorEl={anchor ? anchor : anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={
          child
            ? { horizontal: "right", vertical: "center" }
            : { vertical: "bottom", horizontal: "center" }
        }
        MenuListProps={{
          "aria-labelledby": "navbar-menu",
        }}
      >
        {menu.children?.map((m, k) => renderMenu(m, k))}
      </Menu>
    </>
  );
}
