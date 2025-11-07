import { listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { ChainId } from '@/modules/common/constants/enums';
import { Avatar, Box, Chip, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { FEATURED_COINS } from '../constants';
import { CoinTypes } from '../constants/enums';
import { Coin } from '../types';
import { TOKEN_ICON_URL } from '../utils/token';

interface Props {
  chainId?: ChainId;
  onSelect: (coin: Coin) => void;
}

function FeaturedCoinsChips({ chainId, onSelect }: Props) {
  const coins = chainId ? FEATURED_COINS[chainId] ?? [] : [];
  const prefersReducedMotion = useReducedMotion();

  if (coins.length === 0) {
    return null;
  }

  if (prefersReducedMotion) {
    return (
      <Box px={2}>
        <Stack direction="row" spacing={1}>
          {coins.map((coin, index) => (
            <Chip
              key={index}
              icon={
                <Avatar
                  sx={(theme) => ({
                    height: theme.spacing(2.5),
                    width: theme.spacing(2.5),
                  })}
                  src={
                    coin.coinType === CoinTypes.EVM_ERC20
                      ? TOKEN_ICON_URL(coin.contractAddress, coin.network.chainId)
                      : coin.imageUrl
                  }
                />
              }
              onClick={() => onSelect(coin)}
              clickable
              label={coin.symbol.toUpperCase()}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box px={2}>
      <Stack direction="row" spacing={1}>
        {coins.map((coin, index) => (
          <motion.div key={index} variants={listItemVariants}>
            <Chip
              icon={
                <Avatar
                  sx={(theme) => ({
                    height: theme.spacing(2.5),
                    width: theme.spacing(2.5),
                  })}
                  src={
                    coin.coinType === CoinTypes.EVM_ERC20
                      ? TOKEN_ICON_URL(coin.contractAddress, coin.network.chainId)
                      : coin.imageUrl
                  }
                />
              }
              onClick={() => onSelect(coin)}
              clickable
              label={coin.symbol.toUpperCase()}
            />
          </motion.div>
        ))}
      </Stack>
    </Box>
  );
}

export default memo(FeaturedCoinsChips);
