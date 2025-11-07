import { CoinTypes } from "@dexkit/core/constants";
import { EvmCoin } from "@dexkit/core/types";
import { parseUnits } from "@dexkit/core/utils/ethers/parseUnits";
import EvmReceiveQRCode from "@dexkit/ui/components/EvmReceiveQRCode";
import QrCodeIcon from "@mui/icons-material/QrCode";
import type { CellPlugin } from "@react-page/editor";

type Props = {
  receiver?: string | null;
  coin?: EvmCoin | null;
  chainId?: number;
  amount?: number | null;
  ENSName?: string;
};

// you can pass the shape of the data as the generic type argument
const QrCodeReceive: CellPlugin<Props> = {
  Renderer: ({ data }) => (
    <EvmReceiveQRCode
      receiver={data.receiver as string}
      chainId={
        data.coin?.network.chainId ? data.coin?.network.chainId : data.chainId
      }
      contractAddress={
        data.coin?.coinType === CoinTypes.EVM_ERC20
          ? data.coin.contractAddress
          : undefined
      }
      amount={
        data.amount
          ? parseUnits(String(data.amount), data.coin?.decimals).toString()
          : undefined
      }
    />
  ),
  id: "qr-code-receive-payment",
  title: "QR Coin Receive",
  description: "Receive coin payment by people that scan your QR code",
  icon: <QrCodeIcon />,
  version: 1,
};

export default QrCodeReceive;
