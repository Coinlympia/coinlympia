import type {
  GetStaticPaths,
  GetStaticPathsContext,
  GetStaticProps,
  GetStaticPropsContext,
  NextPage,
} from 'next';

import CloseIcon from '@mui/icons-material/Close';

import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { AnimatedCircularProgress } from '@/components/animated/AnimatedCircularProgress';
import { AnimatedIconButton } from '@/components/animated/AnimatedIconButton';
import { CoinLogoSpinner } from '@/components/animated/CoinLogoSpinner';
import { useSwitchNetworkMutation } from '@/hooks/blockchain';
import { useCoinLeagueSwitchNetwork } from '@/hooks/useCoinLeagueSwitchNetwork';
import { useCoinLeagueValidation } from '@/hooks/useCoinLeagueValidation';
import SelectCoinDialog from '@/modules/coinleague/components/dialogs/SelectCoinDialog';
import { GAME_ENDED, GAME_WAITING } from '@/modules/coinleague/constants';
import {
  COIN_LEAGUE_GAME_ONCHAIN_QUERY,
  useCoinLeagueClaim,
  useCoinLeagueGameOnChainQuery,
  useEndGameMutation,
  useGameProfilesState,
  useJoinGameMutation,
  useStartGameMutation,
  useWinner,
} from '@/modules/coinleague/hooks/coinleague';
import { useFactoryAddress } from '@/modules/coinleague/hooks/coinleagueFactory';
import { Coin } from '@/modules/coinleague/types';
import AppPageHeader from '@/modules/common/components/AppPageHeader';
import { ChainId } from '@/modules/common/constants/enums';
import {
  getChainIdFromName,
  getNetworkSlugFromChainId,
  getProviderByChainId,
  isAddressEqual,
} from '@/modules/common/utils';
import { ErrorBoundaryUI } from '@dexkit/ui/components/ErrorBoundary';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import {
  Alert,
  Avatar,
  Box,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import GameCoinList from '@/modules/coinleague/components/GameCoinList';
import PlayersList from '@/modules/coinleague/components/PlayersList';
import { getGameStatus } from '@/modules/coinleague/utils/game';
import { useNotifications } from '@/modules/common/hooks/app';
import { AppNotificationType } from '@/modules/common/types/app';
import { TransactionStatus } from '@/modules/common/types/transactions';

import GameWinnerCard from '@/modules/coinleague/components/GameWinnerCard';
import MainLayout from '@/modules/common/components/layouts/MainLayout';
import {
  TOKEN_ALLOWANCE_QUERY,
  useApproveToken,
  useErc20BalanceQuery,
  useTokenAllowanceQuery,
} from '@dexkit/core/hooks/coin';
import { useWalletConnect } from '@dexkit/ui/hooks/wallet';
import { Check, Edit, SwapHoriz as SwitchIcon, AccountBalanceWallet as WalletIcon } from '@mui/icons-material';
import Token from '@mui/icons-material/Token';
import { BigNumber, ethers, providers } from 'ethers';

import { GameOverviewCard } from '@/modules/coinleague/components/GameOverviewCard';
import CoinLeagueSelectNetworkDialog from '@/modules/common/components/CoinLeagueSelectNetworkDialog';
import { getWindowUrl } from '@/modules/common/utils/browser';
import ShareDialogV2 from '@dexkit/ui/components/dialogs/ShareDialogV2';
import dynamic from 'next/dynamic';
import { generateShareLink, ShareTypes } from 'src/utils/share';
import { parseEther } from 'viem';
import { PriceFeeds } from '@/modules/coinleague/constants';


const CoinLeagueGame: NextPage = () => {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { addNotification } = useNotifications();

  const { account, isActive, signer, chainId: accountChainID } = useWeb3React();
  const validation = useCoinLeagueValidation();
  const { openDialog: openSwitchNetwork, isOpen: isSwitchNetworkOpen, closeDialog: closeSwitchNetwork } = useCoinLeagueSwitchNetwork();
  const switchNetworkMutation = useSwitchNetworkMutation();

  const { network, id, affiliate } = router.query;

  const chainId = useMemo(() => {
    return getChainIdFromName(network as string)?.chainId;
  }, [network]);

  const provider = getProviderByChainId(chainId) as providers.Web3Provider;

  const isSameChainId = accountChainID === chainId;

  const [showSelectCoin, setShowSelectCoin] = useState(false);
  const [isSelectMultiple, setIsSelectMultiple] = useState(false);

  const [selectedCoins, setSelectedCoins] = useState<{ [key: string]: Coin }>(
    {},
  );

  const { connectWallet } = useWalletConnect();

  const coinList = useMemo(() => {
    return Object.keys(selectedCoins).map((k) => selectedCoins[k]);
  }, [selectedCoins]);

  const [selectedCaptain, setSelectedCaptain] = useState<Coin>();

  const factoryAddress = useFactoryAddress();

  const gameOnChainQuery = useCoinLeagueGameOnChainQuery({
    factoryAddress,
    id: id as string,
    provider,
  });

  const erc20Balance = useErc20BalanceQuery({
    contractAddress: gameOnChainQuery.data?.coin_to_play,
    account,
    provider,
    chainId,
  });

  const tokenAllowanceQuery = useTokenAllowanceQuery({
    account: account,
    tokenAddress: gameOnChainQuery.data?.coin_to_play,
    spender: factoryAddress,
    signer,
  });

  const hasSufficientFunds = useMemo(() => {
    return (
      erc20Balance.data &&
      gameOnChainQuery.data &&
      isSameChainId &&
      erc20Balance.data.gte(
        BigNumber.from(gameOnChainQuery.data?.amount_to_play),
      )
    );
  }, [gameOnChainQuery.data, erc20Balance.data]);

  const hasSufficientAllowance = useMemo(() => {
    return (
      gameOnChainQuery.data &&
      gameOnChainQuery.data?.amount_to_play &&
      isSameChainId &&
      tokenAllowanceQuery.data?.gte(gameOnChainQuery.data?.amount_to_play)
    );
  }, [gameOnChainQuery.data, tokenAllowanceQuery.data, isSameChainId]);

  const canJoinGame = useMemo(() => {
    const countSelectedCoins = Object.keys(selectedCoins).length;

    const numCoins = gameOnChainQuery.data?.num_coins || 0;

    const notStarted = !gameOnChainQuery.data?.started;

    const isAllCoinsSelecteds =
      gameOnChainQuery.data &&
      countSelectedCoins === numCoins - 1 &&
      selectedCaptain;

    return (
      isAllCoinsSelecteds &&
      hasSufficientFunds &&
      hasSufficientAllowance &&
      notStarted
    );
  }, [
    selectedCaptain,
    selectedCoins,
    gameOnChainQuery.data,
    hasSufficientFunds,
    hasSufficientAllowance,
  ]);

  const handleRefetchGame = async () => {
    queryClient.invalidateQueries({
      queryKey: [COIN_LEAGUE_GAME_ONCHAIN_QUERY],
      exact: false,
    });
  };

  const game = gameOnChainQuery.data;

  const canEnd = useMemo(() => {
    if (game) {
      const date = new Date().getTime() / 1000;

      return (
        game.started &&
        !game.finished &&
        date > Number(game.start_timestamp) + Number(game.duration)
      );
    }
  }, [game]);

  const handleJoinSubmit = (hash: string) => {
    if (chainId !== undefined) {
      const now = Date.now();

      addNotification({
        notification: {
          type: AppNotificationType.Transaction,
          title: formatMessage(
            {
              defaultMessage: 'Joining Game #{id}',
              id: 'join.game.id',
            },
            { id },
          ) as string,
          hash,
          checked: false,
          created: now,
          icon: 'receipt',
          body: '',
        },
        transaction: {
          status: TransactionStatus.Pending,
          created: now,
          chainId,
        },
      });
    }
  };

  const approveTokenMutation = useApproveToken();

  const playerAddresses = useMemo(() => {
    if (gameOnChainQuery.data && gameOnChainQuery.data?.players) {
      return gameOnChainQuery.data?.players.map((p) => p.player_address);
    }
  }, [gameOnChainQuery.data]);

  const gameProfilesStateQuery = useGameProfilesState(playerAddresses);

  const isInGame = useMemo(() => {
    return (
      playerAddresses?.find((address) => isAddressEqual(address, account)) !==
      undefined
    );
  }, [playerAddresses, account]);

  const currentPlayerCoins = useMemo(() => {
    if (!gameOnChainQuery.data?.players || !account || !chainId) {
      return { captainCoin: undefined, coinFeeds: [] };
    }

    const player = gameOnChainQuery.data.players.find((p) =>
      isAddressEqual(p.player_address, account)
    );

    if (!player) {
      return { captainCoin: undefined, coinFeeds: [] };
    }

    const availableCoins = PriceFeeds[chainId] || [];
    
    const captainCoin = availableCoins.find((c) =>
      isAddressEqual(c.address, player.captain_coin)
    );

    const coinFeeds = (player.coin_feeds || [])
      .map((feedAddress) =>
        availableCoins.find((c) => isAddressEqual(c.address, feedAddress))
      )
      .filter((coin): coin is Coin => coin !== undefined);

    return { captainCoin, coinFeeds };
  }, [gameOnChainQuery.data?.players, account, chainId]);

  const [editingPlayerCoins, setEditingPlayerCoins] = useState(false);
  const [editingCaptainCoin, setEditingCaptainCoin] = useState(false);
  const [editingCoins, setEditingCoins] = useState(false);
  const [editedCaptainCoin, setEditedCaptainCoin] = useState<Coin>();
  const [editedCoins, setEditedCoins] = useState<{ [key: string]: Coin }>({});

  const currentCaptainCoin = useMemo(() => {
    return editedCaptainCoin || selectedCaptain || currentPlayerCoins.captainCoin;
  }, [editedCaptainCoin, selectedCaptain, currentPlayerCoins.captainCoin]);

  const currentCoinFeeds = useMemo(() => {
    if (Object.keys(editedCoins).length > 0) {
      return Object.keys(editedCoins).map((key) => editedCoins[key].address);
    }
    if (Object.keys(selectedCoins).length > 0) {
      return Object.keys(selectedCoins).map((key) => selectedCoins[key].address);
    }
    return currentPlayerCoins.coinFeeds.map((coin) => coin.address);
  }, [editedCoins, selectedCoins, currentPlayerCoins.coinFeeds]);

  const joinGameMutation = useJoinGameMutation({
    affiliate: affiliate as string,
    captainCoinFeed: currentCaptainCoin?.address,
    coinFeeds: currentCoinFeeds,
    factoryAddress,
    gameId: id as string,
    provider,
    signer,
    onSubmit: handleJoinSubmit,
    options: {
      onMutate: async () => {
        await queryClient.cancelQueries([COIN_LEAGUE_GAME_ONCHAIN_QUERY]);
      },
      onSuccess: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        queryClient.invalidateQueries({
          queryKey: [COIN_LEAGUE_GAME_ONCHAIN_QUERY],
          exact: false,
        });
        setEditedCaptainCoin(undefined);
        setEditedCoins({});
        setEditingPlayerCoins(false);
        setEditingCaptainCoin(false);
        setEditingCoins(false);
      },
    },
  });

  const handleStartSubmit = (hash: string) => {
    if (chainId !== undefined) {
      const now = Date.now();

      addNotification({
        notification: {
          type: AppNotificationType.Transaction,
          title: formatMessage(
            {
              defaultMessage: 'Starting Game #{id}',
              id: 'starting.game.id',
            },
            { id },
          ) as string,
          hash,
          checked: false,
          created: now,
          icon: 'play_arrow',
          body: '',
        },
        transaction: {
          status: TransactionStatus.Pending,
          created: now,
          chainId,
        },
      });
    }
  };

  const startGameMutation = useStartGameMutation({
    factoryAddress,
    gameId: id as string,
    provider,
    signer,
    onSubmit: handleStartSubmit,
    options: {
      onSuccess: handleRefetchGame,
    },
  });

  const handleEndGameSubmit = (hash: string) => {
    if (chainId !== undefined) {
      const now = Date.now();

      addNotification({
        notification: {
          type: AppNotificationType.Transaction,
          title: formatMessage(
            {
              defaultMessage: 'Ending Game #{id}',
              id: 'ending.game.id',
            },
            { id },
          ) as string,
          hash,
          checked: false,
          created: now,
          icon: 'play_arrow',
          body: '',
        },
        transaction: {
          status: TransactionStatus.Pending,
          created: now,
          chainId,
        },
      });
    }
  };

  const endGameMutation = useEndGameMutation({
    factoryAddress,
    gameId: id as string,
    provider,
    signer,
    onSubmit: handleEndGameSubmit,
    options: {
      onSuccess: handleRefetchGame,
    },
  });

  const handleApproveSuccess = async () => {
    await queryClient.refetchQueries([TOKEN_ALLOWANCE_QUERY]);
  };

  const handleApproveSubmit = (hash: string) => {
    if (chainId !== undefined) {
      const now = Date.now();

      addNotification({
        notification: {
          type: AppNotificationType.Transaction,
          title: formatMessage(
            {
              defaultMessage: 'Approve Coinlympia Token Spend',
              id: 'approve.coin.league.token.spend',
            },
            { id },
          ) as string,
          hash,
          checked: false,
          created: now,
          icon: 'check',
          body: '',
        },
        transaction: {
          status: TransactionStatus.Pending,
          created: now,
          chainId,
        },
      });
    }
  };

  const isWaiting = useMemo(() => {
    return (
      gameOnChainQuery.data &&
      getGameStatus(gameOnChainQuery.data) === GAME_WAITING
    );
  }, [gameOnChainQuery.data]);

  const hasSufficientPlayers = useMemo(() => {
    return gameOnChainQuery.data && gameOnChainQuery.data.players?.length >= 2;
  }, [gameOnChainQuery.data]);

  const { data: winner, refetch: refetchWinner } = useWinner({
    id: id as string,
    account,
    provider,
    factoryAddress,
  });

  const handleClaimSubmit = (hash: string) => {
    if (chainId !== undefined) {
      const now = Date.now();

      addNotification({
        notification: {
          type: AppNotificationType.Transaction,
          title: formatMessage(
            {
              defaultMessage: 'Claim Game #{id}',
              id: 'claim.game.id',
            },
            { id },
          ) as string,
          hash,
          checked: false,
          created: now,
          icon: 'attach_money',
          body: '',
        },
        transaction: {
          status: TransactionStatus.Pending,
          created: now,
          chainId,
        },
      });
    }
  };

  const claimMutation = useCoinLeagueClaim({
    id: id as string,
    account,
    factoryAddress,
    onSubmited: handleClaimSubmit,
    provider,
    signer,
    options: {
      onSuccess() {
        refetchWinner();
      },
    },
  });

  const handleCloseCoinDialog = () => {
    setShowSelectCoin(false);
    setIsSelectMultiple(false);
  };

  const handleSelectCaptain = () => {
    setShowSelectCoin(true);
  };

  const handleSelectCoins = () => {
    setShowSelectCoin(true);
    setIsSelectMultiple(true);
  };

  const handleSave = (coins: { [key: string]: Coin }) => {
    if (editingPlayerCoins) {
      if (editingCaptainCoin) {
        setEditedCaptainCoin(Object.keys(coins).map((k) => coins[k])[0]);
      } else if (editingCoins) {
        setEditedCoins(coins);
      }
      handleCloseCoinDialog();
      setEditingPlayerCoins(false);
      setEditingCaptainCoin(false);
      setEditingCoins(false);
    } else {
      if (!isSelectMultiple) {
        setSelectedCaptain(Object.keys(coins).map((k) => coins[k])[0]);
      } else {
        setSelectedCoins(coins);
      }
      handleCloseCoinDialog();
    }
  };

  const handleEditCaptainCoin = () => {
    if (currentPlayerCoins.captainCoin) {
      if (!editedCaptainCoin) {
        setEditedCaptainCoin(currentPlayerCoins.captainCoin);
      }
      setEditingPlayerCoins(true);
      setEditingCaptainCoin(true);
      setShowSelectCoin(true);
      setIsSelectMultiple(false);
    }
  };

  const handleEditCoins = () => {
    if (Object.keys(editedCoins).length === 0) {
      const coinsObj: { [key: string]: Coin } = {};
      currentPlayerCoins.coinFeeds.forEach((coin) => {
        coinsObj[coin.address] = coin;
      });
      setEditedCoins(coinsObj);
    }
    setEditingPlayerCoins(true);
    setEditingCoins(true);
    setShowSelectCoin(true);
    setIsSelectMultiple(true);
  };

  const handleUpdateSelections = async () => {
    const captainCoin = editedCaptainCoin || currentPlayerCoins.captainCoin;
    const coins = Object.keys(editedCoins).length > 0 
      ? editedCoins 
      : currentPlayerCoins.coinFeeds.reduce((acc, coin) => {
          acc[coin.address] = coin;
          return acc;
        }, {} as { [key: string]: Coin });

    if (!captainCoin || !gameOnChainQuery.data || Object.keys(coins).length === 0) return;

    try {
      if (!hasSufficientAllowance) {
        await approveTokenMutation.mutateAsync({
          spender: factoryAddress,
          tokenContract: gameOnChainQuery.data?.coin_to_play,
          signer,
          amount: BigNumber.from(parseEther('1000000000').toString()),
          onSubmited: handleApproveSubmit,
        });
        await handleApproveSuccess();
      }

      joinGameMutation.mutate();
    } catch (error) {
    }
  };

  const handleRemoveCoin = (coin: Coin) => {
    if (coin.address in selectedCoins) {
      setSelectedCoins((coins) => {
        let newCoins = { ...coins };

        delete newCoins[coin.address];

        return newCoins;
      });
    }
  };

  const handleRemoveCaptain = () => {
    setSelectedCaptain(undefined);
  };

  const handleApproveToken = async () => {
    await approveTokenMutation.mutateAsync({
      spender: factoryAddress,
      tokenContract: gameOnChainQuery.data?.coin_to_play,
      signer,
      amount: BigNumber.from(parseEther('1000000000').toString()),
      onSubmited: handleApproveSubmit,
    });
    handleApproveSuccess();
  };

  const handleJoinGame = async () => {
    try {
      if (!hasSufficientAllowance) {
        await approveTokenMutation.mutateAsync({
          spender: factoryAddress,
          tokenContract: gameOnChainQuery.data?.coin_to_play,
          signer,
          amount: BigNumber.from(parseEther('1000000000').toString()),
          onSubmited: handleApproveSubmit,
        });
        await handleApproveSuccess();
      }

      joinGameMutation.mutate();
    } catch (error) {
    }
  };

  const handleConnectWallet = () => {
    connectWallet();
  };

  const handleSwitchToPolygon = async () => {
    try {
      await switchNetworkMutation.mutateAsync({ chainId: ChainId.Polygon });
    } catch (error) {
    }
  };

  const handleStartGame = async () => {
    await startGameMutation.mutateAsync();
  };

  const handleEndGame = async () => {
    await endGameMutation.mutateAsync();
  };

  const handleClaim = async () => {
    await claimMutation.mutateAsync();
  };

  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleCloseShareDialog = () => {
    setShowShareDialog(false);
  };
  const shareUrl = `${getWindowUrl()}/game/${getNetworkSlugFromChainId(
    chainId,
  )}/${id}${account ? `?affiliate=${account}` : ''}`;

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const { formatMessage } = useIntl();

  const handleShareContent = (value: string) => {
    const msg = formatMessage(
      {
        id: 'share.game.message',
        defaultMessage: 'Play with me at Coinlympia! Join the game: {url}',
      },
      { url: shareUrl }
    );

    let link = '';

    if (ShareTypes.includes(value) && shareUrl) {
      link = generateShareLink(msg, shareUrl, value);

      window.open(link, '_blank');
    }
  };

  return (
    <>
      <ShareDialogV2
        DialogProps={{
          open: showShareDialog,
          onClose: handleCloseShareDialog,
          fullWidth: true,
          maxWidth: 'sm',
        }}
        onClick={handleShareContent}
        url={shareUrl}
      />
      {showSelectCoin && (
        <SelectCoinDialog
          dialogProps={{
            open: showSelectCoin,
            onClose: handleCloseCoinDialog,
            fullWidth: true,
            maxWidth: 'sm',
          }}
          maxCoins={
            editingPlayerCoins
              ? editingCoins && gameOnChainQuery.data
                ? gameOnChainQuery.data?.num_coins - 1
                : 1
              : isSelectMultiple && gameOnChainQuery.data
              ? gameOnChainQuery.data?.num_coins - 1
              : 1
          }
          chainId={chainId}
          selectMultiple={editingPlayerCoins ? editingCoins : isSelectMultiple}
          selectedCoins={
            editingPlayerCoins
              ? editingCaptainCoin
                ? { [editedCaptainCoin.address]: editedCaptainCoin }
                : editingCoins
                ? editedCoins
                : {}
              : isSelectMultiple
              ? selectedCoins
              : selectedCaptain
                ? { [selectedCaptain.address]: selectedCaptain }
                : {}
          }
          excludeTokens={
            editingPlayerCoins
              ? editingCaptainCoin
                ? editedCoins
                : editingCoins && editedCaptainCoin
                ? { [editedCaptainCoin.address]: editedCaptainCoin }
                : {}
              : !isSelectMultiple
              ? selectedCoins
              : selectedCaptain
                ? { [selectedCaptain.address]: selectedCaptain }
                : {}
          }
          onSave={handleSave}
        />
      )}
      {isSwitchNetworkOpen && (
        <CoinLeagueSelectNetworkDialog
          dialogProps={{
            open: isSwitchNetworkOpen,
            onClose: closeSwitchNetwork,
            fullWidth: true,
            maxWidth: 'xs',
          }}
        />
      )}
      <AnimatePresence>
        {(joinGameMutation.isLoading || joinGameMutation.isPending) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Box
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 3,
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  minWidth: 280,
                }}
              >
                <CoinLogoSpinner size={120} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    <FormattedMessage
                      id="joining.game"
                      defaultMessage="Joining game..."
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage
                      id="please.wait.transaction"
                      defaultMessage="Please wait while we process your transaction"
                    />
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Stack spacing={2}>
        <AppPageHeader
          breadcrumbs={[
            {
              caption: <FormattedMessage id="home" defaultMessage="Home" />,
              uri: '/',
            },
            {
              caption: (
                <FormattedMessage
                  id="coin.league"
                  defaultMessage="Coinlympia"
                />
              ),
              uri: '/',
            },
            {
              caption: (
                <FormattedMessage
                  id="game"
                  defaultMessage="Game #{id}"
                  values={{ id: gameOnChainQuery.data?.id }}
                />
              ),
              uri: '/',
              active: true,
            },
          ]}
        />
        <ErrorBoundaryUI>
          {validation.needsNetworkSwitch && (
            <Alert
              severity="error"
              action={
                <AnimatedButton
                  startIcon={<SwitchIcon />}
                  size="small"
                  onClick={handleSwitchToPolygon}
                  disabled={switchNetworkMutation.isLoading}
                  variant="outlined"
                >
                  <FormattedMessage
                    id="coinleague.switch.to.polygon"
                    defaultMessage="Switch to Polygon"
                  />
                </AnimatedButton>
              }
            >
              <FormattedMessage
                id="coinleague.wrong.network.title"
                defaultMessage="Wrong Network"
              />
              <br />
              <FormattedMessage
                id="coinleague.wrong.network.description"
                defaultMessage="Coinlympia games are only available on Polygon network. Please switch your wallet to Polygon to continue."
              />
            </Alert>
          )}
          {validation.needsWallet && (
            <Alert
              severity="error"
              action={
                <AnimatedButton
                  startIcon={<WalletIcon />}
                  size="small"
                  onClick={() => connectWallet()}
                  variant="outlined"
                >
                  <FormattedMessage
                    id="coinlympia.connect.wallet"
                    defaultMessage="Connect Wallet"
                  />
                </AnimatedButton>
              }
            >
              <FormattedMessage
                id="coinlympia.wallet.required.title"
                defaultMessage="Wallet Required"
              />
              <br />
              <FormattedMessage
                id="coinlympia.wallet.required.description"
                defaultMessage="You need to connect your wallet to participate in Coinlympia games."
              />
            </Alert>
          )}
          {!hasSufficientAllowance && isActive && !isInGame && isWaiting && validation.canPlay && (
            <Alert
              severity="warning"
              action={
                <AnimatedButton
                  disabled={approveTokenMutation.isLoading}
                  startIcon={
                    approveTokenMutation.isLoading ? (
                      <AnimatedCircularProgress size="1rem" color="inherit" />
                    ) : (
                      <Check />
                    )
                  }
                  size="small"
                  onClick={handleApproveToken}
                  variant="outlined"
                >
                  <FormattedMessage id="approve" defaultMessage="Approve" />
                </AnimatedButton>
              }
            >
              <FormattedMessage
                id="need.token.approval.to.join.the.game"
                defaultMessage="Need token approval to join the game"
              />
            </Alert>
          )}
          {!hasSufficientFunds && !isInGame && isActive && isWaiting && validation.canPlay && (
            <Alert severity="warning">
              <FormattedMessage
                id="insufficient.funds"
                defaultMessage="Insufficient funds"
              />
            </Alert>
          )}
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          <GameOverviewCard
            chainId={getChainIdFromName(network as string)?.chainId}
            id={id as string}
            provider={provider}
            factoryAddress={factoryAddress}
            onJoin={handleJoinGame}
            isInGame={isInGame}
            canJoinGame={(canJoinGame as boolean) && (isWaiting as boolean)}
            isJoining={joinGameMutation.isLoading}
            onStart={handleStartGame}
            canStart={
              isInGame &&
              (isWaiting as boolean) &&
              (hasSufficientPlayers as boolean) &&
              !!gameOnChainQuery.data &&
              new Date().getTime() / 1000 >
              Number(gameOnChainQuery.data.start_timestamp)
            }
            isStarting={startGameMutation.isLoading}
            onEnd={handleEndGame}
            onShare={handleShare}
            canEnd={canEnd}
            isEnding={endGameMutation.isLoading}
            onRefetch={handleRefetchGame}
          />
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          {isActive &&
            gameOnChainQuery.data &&
            getGameStatus(gameOnChainQuery.data) === GAME_ENDED &&
            !isAddressEqual(
              winner?.winner_address,
              ethers.constants.AddressZero,
            ) && (
              <GameWinnerCard
                account={account}
                game={gameOnChainQuery.data}
                chainId={chainId}
                claimed={winner?.claimed}
                onClaim={handleClaim}
                isClaiming={claimMutation.isLoading}
              />
            )}
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          {isActive && isWaiting && !isInGame && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box>
                    <AnimatedCard>
                      <Box sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            <FormattedMessage
                              id="captain.coin"
                              defaultMessage="Captain Coin"
                            />
                          </Typography>

                          <AnimatedButton
                            variant="outlined"
                            onClick={handleSelectCaptain}
                            size="small"
                            disabled={validation.needsNetworkSwitch || validation.needsWallet}
                          >
                            <FormattedMessage
                              id="select"
                              defaultMessage="Select"
                            />
                          </AnimatedButton>
                        </Stack>
                      </Box>
                      <Divider />
                      <Box sx={{ p: 2 }}>
                        {selectedCaptain ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={2}
                            >
                              <Avatar src={selectedCaptain.logo}>
                                <Token />
                              </Avatar>
                              <Box>
                                <Typography variant="body1">
                                  {selectedCaptain.baseName}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  {selectedCaptain.base}
                                </Typography>
                              </Box>
                            </Stack>

                            {selectedCaptain && (
                              <AnimatedIconButton onClick={handleRemoveCaptain}>
                                <CloseIcon />
                              </AnimatedIconButton>
                            )}
                          </Stack>
                        ) : (
                          <Box>
                            <Typography variant="h5" align="center">
                              <FormattedMessage
                                id="no.captain"
                                defaultMessage="No Captain"
                              />
                            </Typography>
                            <Typography
                              variant="body1"
                              align="center"
                              color="textSecondary"
                            >
                              <FormattedMessage
                                id="please.select.your.captain.coin"
                                defaultMessage="Please, select your captain coin"
                              />
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </AnimatedCard>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AnimatedCard>
                    <Box sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          <FormattedMessage
                            id="your.coins"
                            defaultMessage="Your coins"
                          />
                        </Typography>

                        <AnimatedButton
                          variant="outlined"
                          onClick={handleSelectCoins}
                          startIcon={<Edit />}
                          size="small"
                          disabled={validation.needsNetworkSwitch || validation.needsWallet}
                        >
                          {coinList.length > 0 ? (
                            <FormattedMessage id="edit" defaultMessage="Edit" />
                          ) : (
                            <FormattedMessage
                              id="select"
                              defaultMessage="Select"
                            />
                          )}
                        </AnimatedButton>
                      </Stack>
                    </Box>
                    {coinList.length > 0 ? (
                      <>
                        <Divider />
                        <GameCoinList
                          coins={coinList}
                          onRemove={handleRemoveCoin}
                        />
                      </>
                    ) : (
                      <>
                        <Divider />
                        <Box sx={{ p: 2 }}>
                          <Typography variant="h5" align="center">
                            <FormattedMessage
                              id="no.coins"
                              defaultMessage="No Coins"
                            />
                          </Typography>
                          <Typography
                            variant="body1"
                            align="center"
                            color="textSecondary"
                          >
                            <FormattedMessage
                              id="please.select.your.coins"
                              defaultMessage="Please, select your coins"
                            />
                          </Typography>
                        </Box>
                      </>
                    )}
                  </AnimatedCard>
                </Grid>
              </Grid>
            </Box>
          )}
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          {isActive && isWaiting && isInGame && (
            <Box>
              <AnimatedCard>
                <Box sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      <FormattedMessage
                        id="edit.selections"
                        defaultMessage="Edit Selections"
                      />
                    </Typography>
                    <AnimatedButton
                      variant="contained"
                      onClick={handleUpdateSelections}
                      disabled={
                        !currentCaptainCoin ||
                        currentCoinFeeds.length === 0 ||
                        joinGameMutation.isLoading ||
                        validation.needsNetworkSwitch ||
                        validation.needsWallet
                      }
                      startIcon={
                        joinGameMutation.isLoading ? (
                          <AnimatedCircularProgress size="1rem" color="inherit" />
                        ) : (
                          <Check />
                        )
                      }
                      sx={{
                        color: 'white',
                        '&:hover': {
                          color: 'white',
                        },
                        '&:disabled': {
                          color: 'white',
                        },
                      }}
                    >
                      <FormattedMessage
                        id="update.selections"
                        defaultMessage="Update Selections"
                      />
                    </AnimatedButton>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <AnimatedCard>
                        <Box sx={{ p: 2 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              <FormattedMessage
                                id="captain.coin"
                                defaultMessage="Captain Coin"
                              />
                            </Typography>
                            <AnimatedButton
                              variant="outlined"
                              onClick={handleEditCaptainCoin}
                              size="small"
                              disabled={
                                validation.needsNetworkSwitch ||
                                validation.needsWallet
                              }
                            >
                              <FormattedMessage id="edit" defaultMessage="Edit" />
                            </AnimatedButton>
                          </Stack>
                        </Box>
                        <Divider />
                        <Box sx={{ p: 2 }}>
                          {(editedCaptainCoin || currentPlayerCoins.captainCoin) ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2}
                              >
                                <Avatar
                                  src={
                                    (editedCaptainCoin || currentPlayerCoins.captainCoin)
                                      ?.logo
                                  }
                                >
                                  <Token />
                                </Avatar>
                                <Box>
                                  <Typography variant="body1">
                                    {(editedCaptainCoin || currentPlayerCoins.captainCoin)
                                      ?.baseName}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {(editedCaptainCoin || currentPlayerCoins.captainCoin)
                                      ?.base}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>
                          ) : (
                            <Box>
                              <Typography variant="h5" align="center">
                                <FormattedMessage
                                  id="no.captain"
                                  defaultMessage="No Captain"
                                />
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </AnimatedCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <AnimatedCard>
                        <Box sx={{ p: 2 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              <FormattedMessage
                                id="your.coins"
                                defaultMessage="Your coins"
                              />
                            </Typography>
                            <AnimatedButton
                              variant="outlined"
                              onClick={handleEditCoins}
                              startIcon={<Edit />}
                              size="small"
                              disabled={
                                validation.needsNetworkSwitch ||
                                validation.needsWallet
                              }
                            >
                              <FormattedMessage id="edit" defaultMessage="Edit" />
                            </AnimatedButton>
                          </Stack>
                        </Box>
                        <Divider />
                        <Box sx={{ p: 2 }}>
                          {Object.keys(editedCoins).length > 0 ||
                          currentPlayerCoins.coinFeeds.length > 0 ? (
                            <GameCoinList
                              coins={
                                Object.keys(editedCoins).length > 0
                                  ? Object.keys(editedCoins).map(
                                      (k) => editedCoins[k]
                                    )
                                  : currentPlayerCoins.coinFeeds
                              }
                              onRemove={() => {}}
                            />
                          ) : (
                            <Box>
                              <Typography variant="h5" align="center">
                                <FormattedMessage
                                  id="no.coins"
                                  defaultMessage="No Coins"
                                />
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </AnimatedCard>
                    </Grid>
                  </Grid>
                </Box>
              </AnimatedCard>
            </Box>
          )}
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          <Typography variant="h5">
            <FormattedMessage id="players" defaultMessage="Players" />
          </Typography>
          <Box>
            {gameOnChainQuery.data && chainId && (
              <Paper>
                <PlayersList
                  gameType={gameOnChainQuery.data.game_type - 1}
                  isLoadingGame={gameOnChainQuery.isLoading}
                  profiles={gameProfilesStateQuery.profiles}
                  players={gameOnChainQuery.data?.players}
                  chainId={chainId}
                  account={account}
                  game={gameOnChainQuery.data}
                  showWinners={
                    getGameStatus(gameOnChainQuery.data) === GAME_ENDED
                  }
                  hideCoins={
                    getGameStatus(gameOnChainQuery.data) === GAME_WAITING
                  }
                />
              </Paper>
            )}
          </Box>
          {/* <Box
            display={'flex'}
            justifyContent={'flex-end'}
            alignItems={'flex-end'}
          >
            <GameActionsButton
              game={gameOnChainQuery.data as unknown as Game}
            />
          </Box>*/}
        </ErrorBoundaryUI>
        <ErrorBoundaryUI>
          {!isActive &&
            gameOnChainQuery.data &&
            getGameStatus(gameOnChainQuery.data) !== GAME_ENDED && (
              <Box>
                <Stack
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h5" align="center">
                      <FormattedMessage
                        id="connect.wallet"
                        defaultMessage="Connect wallet"
                      />
                    </Typography>
                    <Typography
                      variant="body1"
                      color="textSecondary"
                      align="center"
                    >
                      <FormattedMessage
                        id="you.need.to.connect.your.wallet.to.continue"
                        defaultMessage="You need to connect your wallet to continue"
                      />
                    </Typography>
                  </Box>
                  <AnimatedButton
                    startIcon={<WalletIcon />}
                    onClick={handleConnectWallet}
                    variant="contained"
                  >
                    <FormattedMessage id="connect" defaultMessage="Connect" />
                  </AnimatedButton>
                </Stack>
              </Box>
            )}
        </ErrorBoundaryUI>
      </Stack>
    </>
  );
};

const CoinleagueGameWithLayout = () => {
  return (
    <MainLayout>
      <CoinLeagueGame />
    </MainLayout>
  );
};

type Params = {
  id?: string;
  network?: string;
};

export const getStaticProps: GetStaticProps = async ({
  params,
}: GetStaticPropsContext<Params>) => {
  const queryClient = new QueryClient();

  /*if (params) {
    const { id, network } = params;

    if (network && id) {
      try {
        const chain = getChainIdFromName(network);

        if (chain) {
          const factoryAddress =
            COIN_LEAGUES_FACTORY_ADDRESS_V3[
              GET_LEAGUES_CHAIN_ID(chain.chainId)
            ];

          const provider = getProviderByChainId(chain.chainId);

          if (provider) {
            const game = await getCoinLeagueGameOnChain(
              provider,
              factoryAddress,
              id as string,
            );

            if (game) {
              await queryClient.prefetchQuery(
                [COIN_LEAGUE_GAME_ONCHAIN_QUERY, factoryAddress, id, provider],
                async () => {
                  return game;
                },
              );
            }
          }
        }
      } catch (e) {
      }
    }
  }*/

  return {
    props: {
      //dehydratedState: dehydrate(queryClient),
    },
  };
};

export const getStaticPaths: GetStaticPaths<
  Params
> = ({ }: GetStaticPathsContext) => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export default CoinleagueGameWithLayout;
