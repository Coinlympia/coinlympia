import { fadeVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { AnimatedSkeleton } from '@/components/animated/AnimatedSkeleton';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';

export default function GameCardSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  const skeletonContent = (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography>
            <AnimatedSkeleton />
          </Typography>
          <Divider />
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                <AnimatedSkeleton />
              </Typography>
              <Typography sx={{ fontWeight: 600 }} variant="h5">
                <AnimatedSkeleton />
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                <AnimatedSkeleton />
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Typography variant="caption" color="textSecondary">
              <AnimatedSkeleton />
            </Typography>
          </Box>
          <Box>
            <Typography variant="body1" align="center">
              <AnimatedSkeleton />
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (prefersReducedMotion) {
    return skeletonContent;
  }

  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
    >
      {skeletonContent}
    </motion.div>
  );
}
