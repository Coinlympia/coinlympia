import SearchIcon from "@mui/icons-material/Search";
import { IconButton, SxProps } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import { useState } from "react";
import { SearchBar } from "./SearchBar";
interface Props {
  hideCollections?: boolean;
  hideTokens?: boolean;
  isPreview?: boolean;
}

const sx: SxProps = {
  "& .MuiDialog-container": {
    alignItems: "flex-start",
  },
};

export default function SearchBarMobile(props: Props) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <IconButton aria-label={"Search"} onClick={() => setOpen(true)}>
        <SearchIcon sx={{ fontSize: "30px" }} />
      </IconButton>
      <Dialog onClose={handleClose} open={open} fullWidth sx={sx}>
        <SearchBar {...props} fullWidth={true}></SearchBar>
      </Dialog>
    </>
  );
}
