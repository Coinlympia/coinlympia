import { ChainId } from '@/modules/common/constants/enums';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { motion } from 'framer-motion';
import { listVariants, listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { GameGraph } from '../types';
import GameCard from './GameCard';

interface Props {
  games: GameGraph[];
  onShare: (game: GameGraph) => void;
  onShowMetadata: (game: GameGraph) => void;
  chainId?: ChainId;
  affiliate?: string;
}

export default function GamesGrid({
  games,
  affiliate,
  chainId,
  onShare,
  onShowMetadata,
}: Props) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Box>
        <Grid container spacing={2}>
          {games.map((game, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }} key={index}>
              <GameCard
                game={game}
                onShare={onShare}
                chainId={chainId}
                onShowMetadata={onShowMetadata}
                affiliate={affiliate}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={2}>
          {games.map((game, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }} key={index}>
              <motion.div variants={listItemVariants}>
                <GameCard
                  game={game}
                  onShare={onShare}
                  chainId={chainId}
                  onShowMetadata={onShowMetadata}
                  affiliate={affiliate}
                />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Box>
  );
}


