import { copyToClipboard } from "@dexkit/core/utils";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import ShareIcon from "@mui/icons-material/Share";

import {
  Box,
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
  Grid,
  InputAdornment,
  Stack,
  SvgIcon,
  TextField,
} from "@mui/material";

import { FormattedMessage, useIntl } from "react-intl";
import { AppDialogTitle } from "../../AppDialogTitle";
import CopyIconButton from "../../CopyIconButton";
import ShareDialogIconButton from "./ShareDialogIconButton";

import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import PinterestIcon from "@mui/icons-material/Pinterest";
import TelegramIcon from "@mui/icons-material/Telegram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { useCallback } from "react";

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
  </SvgIcon>
);

const OPTIONS: {
  value: string;
  title: React.ReactNode;
  icon: React.ReactNode;
}[] = [
    {
      value: "telegram",
      title: <FormattedMessage id="telegram" defaultMessage="Telegram" />,
      icon: <TelegramIcon />,
    },
    {
      value: "email",
      title: <FormattedMessage id="email" defaultMessage="Email" />,
      icon: <EmailIcon />,
    },
    {
      value: "facebook",
      title: <FormattedMessage id="facebook" defaultMessage="Facebook" />,
      icon: <FacebookIcon />,
    },
    {
      value: "pinterest",
      title: <FormattedMessage id="pinterest" defaultMessage="Pinterest" />,
      icon: <PinterestIcon />,
    },
    {
      value: "whatsapp",
      title: <FormattedMessage id="whatsapp" defaultMessage="WhatsApp" />,
      icon: <WhatsAppIcon />,
    },
    {
      value: "x",
      title: <FormattedMessage id="x" defaultMessage="X" />,
      icon: <XIcon />,
    },
  ];

export interface ShareDialogV2Props {
  DialogProps: DialogProps;
  url?: string;
  message?: string;
  onClick: (value: string) => void;
}

export default function ShareDialogV2({
  DialogProps,
  url,
  message,
  onClick,
}: ShareDialogV2Props) {
  const { onClose } = DialogProps;

  const { formatMessage } = useIntl();

  const handleClose = () => {
    onClose!({}, "backdropClick");
  };

  const handleCopy = () => {
    if (url !== undefined) {
      copyToClipboard(url);
    }
  };

  const handleClick = useCallback(
    (value: string) => {
      return () => {
        onClick(value);
      };
    },
    [onClick]
  );

  return (
    <Dialog {...DialogProps} fullWidth>
      <AppDialogTitle
        icon={<ShareIcon />}
        title={
          <FormattedMessage
            id="share"
            defaultMessage="Share"
            description="Share dialog title"
          />
        }
        onClose={handleClose}
      />
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Box>
              <Stack spacing={2} direction="row" justifyContent="space-between">
                {OPTIONS.map((opt) => (
                  <ShareDialogIconButton
                    key={opt.value}
                    icon={opt.icon}
                    title={opt.title}
                    onClick={handleClick(opt.value)}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              value={url}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <CopyIconButton
                      iconButtonProps={{
                        onClick: handleCopy,
                        size: "small",
                      }}
                      tooltip={formatMessage({
                        id: "copy",
                        defaultMessage: "Copy",
                        description: "Copy text",
                      })}
                      activeTooltip={formatMessage({
                        id: "copied",
                        defaultMessage: "Copied!",
                        description: "Copied text",
                      })}
                    >
                      <FileCopyIcon />
                    </CopyIconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
