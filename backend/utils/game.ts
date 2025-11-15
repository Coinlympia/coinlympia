import { utils } from 'ethers';
import { ChainId, ZEROEX_NATIVE_TOKEN_ADDRESS } from '../constants/enums';
import { CoinToPlay, CoinToPlayInterface } from '../constants/coinleague';
import { GameLevel } from '../constants/coinleague';

export const GET_GAME_LEVEL_AMOUNTS = (
  gameLevel: GameLevel,
  chainId = ChainId.BSC,
  coinToPlayAddress = '0x55d398326f99059fF775485246999027B3197955'
) => {
  const coinToPlay = CoinToPlay[chainId]?.find(
    (c) => c.address.toLowerCase() === coinToPlayAddress?.toLowerCase()
  ) as CoinToPlayInterface;

  if (!coinToPlay) {
    console.error('CoinToPlay not found:', { chainId, coinToPlayAddress });
    throw new Error(`CoinToPlay not found for chainId ${chainId} and address ${coinToPlayAddress}`);
  }

  const isStable =
    coinToPlay &&
    coinToPlay.address.toLowerCase() !==
    ZEROEX_NATIVE_TOKEN_ADDRESS.toLowerCase();

  switch (gameLevel) {
    case GameLevel.Novice:
      if (isStable) {
        return utils.parseUnits('0.001', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('0.01');
        case ChainId.Polygon:
          return utils.parseEther('1');
        default:
          return utils.parseEther('0.01');
      }
    case GameLevel.Beginner:
      if (isStable) {
        return utils.parseUnits('1', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('0.01');
        case ChainId.Polygon:
          return utils.parseEther('1');
        default:
          return utils.parseEther('0.01');
      }

    case GameLevel.Intermediate:
      if (isStable) {
        return utils.parseUnits('10', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('0.05');
        case ChainId.Polygon:
          return utils.parseEther('5');
        default:
          return utils.parseEther('0.05');
      }

    case GameLevel.Advanced:
      if (isStable) {
        return utils.parseUnits('25', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('0.1');
        case ChainId.Polygon:
          return utils.parseEther('10');
        default:
          return utils.parseEther('0.1');
      }
    case GameLevel.Expert:
      if (isStable) {
        return utils.parseUnits('100', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('0.3');
        case ChainId.Polygon:
          return utils.parseEther('50');
        default:
          return utils.parseEther('0.3');
      }
    case GameLevel.Master:
      if (isStable) {
        return utils.parseUnits('250', coinToPlay.decimals);
      }

      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('1');
        case ChainId.Polygon:
          return utils.parseEther('250');
        default:
          return utils.parseEther('1');
      }
    case GameLevel.GrandMaster:
      if (isStable) {
        return utils.parseUnits('500', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.BSC:
          return utils.parseEther('2');
        case ChainId.Polygon:
          return utils.parseEther('500');
        default:
          return utils.parseEther('2');
      }
    default:
      return utils.parseEther('0');
  }
};

