import { useSwitchNetwork } from '@/hooks/blockchain';
import { useCoinLeagueValidation } from '@/hooks/useCoinLeagueValidation';
import { ChainId } from '@/modules/common/constants/enums';
import { useConnectWalletDialog } from '@/modules/common/hooks/misc';
import {
  SwapHoriz as SwitchIcon,
  AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  Button,
  Stack
} from '@mui/material';
import { FormattedMessage } from 'react-intl';

interface CoinLeagueErrorMessageProps {
  variant?: 'filled' | 'outlined' | 'standard';
  showActions?: boolean;
}

export default function CoinLeagueErrorMessage({
  variant = 'outlined',
  showActions = true
}: CoinLeagueErrorMessageProps) {
  const validation = useCoinLeagueValidation();
  const { openDialog: openSwitchNetwork } = useSwitchNetwork();
  const connectWalletDialog = useConnectWalletDialog();

  if (validation.canPlay) {
    return null;
  }

  if (validation.needsWallet) {
    return (
      <Alert
        severity="error"
        variant={variant}
        action={
          showActions ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<WalletIcon />}
              onClick={() => connectWalletDialog.show()}
            >
              <FormattedMessage
                id="coinlympia.connect.wallet"
                defaultMessage="Connect Wallet"
              />
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>
          <FormattedMessage
            id="coinlympia.wallet.required"
            defaultMessage="Wallet Required"
          />
        </AlertTitle>
        <FormattedMessage
          id="coinlympia.wallet.required.message"
          defaultMessage="You must connect your wallet to participate in Coinlympia games."
        />
      </Alert>
    );
  }

  if (validation.needsNetworkSwitch) {
    return (
      <Alert
        severity="warning"
        variant={variant}
        action={
          showActions ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<SwitchIcon />}
              onClick={() => openSwitchNetwork(ChainId.Polygon)}
            >
              <FormattedMessage
                id="coinlympia.switch.network"
                defaultMessage="Switch Network"
              />
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>
          <FormattedMessage
            id="coinlympia.wrong.network"
            defaultMessage="Wrong Network"
          />
        </AlertTitle>
        <Stack spacing={1}>
          <FormattedMessage
            id="coinlympia.wrong.network.message"
            defaultMessage="Coinlympia requires Polygon network. Current network: {chainId}"
            values={{ chainId: validation.chainId }}
          />
          <FormattedMessage
            id="coinlympia.switch.to.polygon.message"
            defaultMessage="Please switch to Polygon (Chain ID: 137) to continue."
          />
        </Stack>
      </Alert>
    );
  }

  return null;
}
