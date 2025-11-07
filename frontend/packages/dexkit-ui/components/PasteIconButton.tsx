import { IconButton } from "@mui/material";
import { useCallback } from "react";

export interface PasteIconButtonProps {
  onPaste: (data: string) => void;
  icon: React.ReactNode;
}

export default function PasteIconButton({
  onPaste,
  icon,
}: PasteIconButtonProps) {
  const handlePaste = useCallback(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        onPaste(text);
      })
      .catch((err) => {
        onPaste("");
      });
  }, [onPaste]);

  return (
    <IconButton size="small" onClick={handlePaste}>
      {icon}
    </IconButton>
  );
}
