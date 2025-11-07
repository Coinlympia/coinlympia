import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { memo } from 'react';
import { AnimatedSkeleton } from '@/components/animated/AnimatedSkeleton';
import { motion } from 'framer-motion';
import { listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

function SelectCoinListSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  const renderItems = () => {
    return new Array(4).fill(null).map((_, index: number) => {
      const item = (
        <ListItem key={index}>
          <ListItemAvatar>
            <AnimatedSkeleton
              variant="circular"
              sx={(theme) => ({
                width: theme.spacing(6),
                height: theme.spacing(6),
              })}
            />
          </ListItemAvatar>
          <ListItemText primary={<AnimatedSkeleton />} secondary={<AnimatedSkeleton />} />
        </ListItem>
      );

      if (prefersReducedMotion) {
        return item;
      }

      return (
        <motion.div key={index} variants={listItemVariants}>
          {item}
        </motion.div>
      );
    });
  };
  return <List>{renderItems()}</List>;
}

export default memo(SelectCoinListSkeleton);
