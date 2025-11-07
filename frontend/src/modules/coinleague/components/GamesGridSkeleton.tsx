import Grid from '@mui/material/Grid';
import { memo } from 'react';
import GameCardSkeleton from './GameCardSkeleton';
import { motion } from 'framer-motion';
import { listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

function GamesGridSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Grid container spacing={2}>
        {new Array(8).fill(null).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 3 }}>
            <GameCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {new Array(8).fill(null).map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 3 }}>
          <motion.div variants={listItemVariants}>
            <GameCardSkeleton />
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
}

export default memo(GamesGridSkeleton);


