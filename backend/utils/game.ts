import { utils } from 'ethers';
import { ChainId, ZEROEX_NATIVE_TOKEN_ADDRESS } from '../constants/enums';
import { CoinToPlay, CoinToPlayInterface } from '../constants/coinleague';
import { GameLevel } from '../constants/coinleague';

export const GET_GAME_LEVEL_AMOUNTS = (
  gameLevel: GameLevel,
  chainId = ChainId.Polygon,
  //This needs to be passed if using a new coin. We are passing here USDT
  coinToPlayAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
) => {
  const coinToPlay = CoinToPlay[chainId]?.find(
    (c) => c.address.toLowerCase() === coinToPlayAddress?.toLowerCase()
  ) as CoinToPlayInterface;

  // Validate coinToPlay exists
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
        case ChainId.Polygon:
          return utils.parseEther('1');
        case ChainId.BSC:
          return utils.parseEther('0.01');
        default:
          return utils.parseEther('1');
      }
    case GameLevel.Beginner:
      if (isStable) {
        return utils.parseUnits('1', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('1');
        case ChainId.BSC:
          return utils.parseEther('0.01');
        default:
          return utils.parseEther('1');
      }

    case GameLevel.Intermediate:
      if (isStable) {
        return utils.parseUnits('10', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('5');
        case ChainId.BSC:
          return utils.parseEther('0.05');
        default:
          return utils.parseEther('5');
      }

    case GameLevel.Advanced:
      if (isStable) {
        return utils.parseUnits('25', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('10');
        case ChainId.BSC:
          return utils.parseEther('0.1');
        default:
          return utils.parseEther('10');
      }
    case GameLevel.Expert:
      if (isStable) {
        return utils.parseUnits('100', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('50');
        case ChainId.BSC:
          return utils.parseEther('0.3');
        default:
          return utils.parseEther('50');
      }
    case GameLevel.Master:
      if (isStable) {
        return utils.parseUnits('250', coinToPlay.decimals);
      }

      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('250');
        case ChainId.BSC:
          return utils.parseEther('1');
        default:
          return utils.parseEther('250');
      }
    case GameLevel.GrandMaster:
      if (isStable) {
        return utils.parseUnits('500', coinToPlay.decimals);
      }
      switch (chainId) {
        case ChainId.Polygon:
          return utils.parseEther('500');
        case ChainId.BSC:
          return utils.parseEther('2');
        default:
          return utils.parseEther('500');
      }
    default:
      return utils.parseEther('0');
  }
};

