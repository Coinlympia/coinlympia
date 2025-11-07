import { motion } from 'framer-motion';
import { Card, CardProps } from '@mui/material';
import { ReactNode } from 'react';
import { cardVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedCardProps extends CardProps {
  children: ReactNode;
  disableHover?: boolean;
  disableTap?: boolean;
}

export function AnimatedCard({
  children,
  disableHover = false,
  disableTap = false,
  ...cardProps
}: AnimatedCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Card {...cardProps}>{children}</Card>;
  }

  const variants = { ...cardVariants };
  if (disableHover) {
    delete variants.hover;
  }
  if (disableTap) {
    delete variants.tap;
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      whileHover={!disableHover ? 'hover' : undefined}
      whileTap={!disableTap ? 'tap' : undefined}
    >
      <Card {...cardProps}>{children}</Card>
    </motion.div>
  );
}

