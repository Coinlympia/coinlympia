
import { createThirdwebClient } from "thirdweb";


import {
  createWallet,
  inAppWallet,
} from "thirdweb/wallets";

export const client = createThirdwebClient({
  clientId: process.env.THIRDWEB_CLIENT_ID || "8b875cba6d295240d3b3861a3e8c2260",
});

export const createWallets = () => [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "coinbase",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export const wallets = createWallets();


export const appMetadata = {
  name: "Coinlympia",
  url: "https://coinlympia.xyz",
  description: "Your fantasy game for crypto coins",
  logoUrl: "https://path/to/my-app/logo.svg",
};