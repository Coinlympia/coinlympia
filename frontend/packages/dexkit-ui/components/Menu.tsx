import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRouter } from "next/router";
import * as React from "react";
import { FormattedMessage } from "react-intl";

import { MenuTree } from "@dexkit/ui/modules/wizard/types/config";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface Props {
  menu: MenuTree;
  isPreview?: boolean;
}

export default function NavbarMenu(props: Props) {
  const router = useRouter();
  const { menu, isPreview } = props;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const goToRoute = (route: string) => {
    router.push(route);
    handleClose();
  };

  return (
    <>
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
        endIcon={<ExpandMoreIcon />}
        onClick={handleClick}
      >
        <FormattedMessage
          id={menu.name.toLowerCase()}
          defaultMessage={menu.name}
        />
      </Button>
      <Menu
        id="navbar-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "navbar-menu",
        }}
      >
        {menu.children?.map((m, k) => (
          <MenuItem
            onClick={() => goToRoute(m.href || "/")}
            key={k}
            disabled={isPreview}
          >
            <FormattedMessage
              id={m.name.toLowerCase()}
              defaultMessage={m.name}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
