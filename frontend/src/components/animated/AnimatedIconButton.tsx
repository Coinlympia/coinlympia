import { buttonVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { IconButton, IconButtonProps } from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedIconButtonProps extends IconButtonProps {
  children: ReactNode;
  disableHover?: boolean;
  disableTap?: boolean;
}

export function AnimatedIconButton({
  children,
  disableHover = false,
  disableTap = false,
  ...iconButtonProps
}: AnimatedIconButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <IconButton {...iconButtonProps}>{children}</IconButton>;
  }

  const variants = { ...buttonVariants };
  if (disableHover) {
    delete variants.hover;
  }
  if (disableTap) {
    delete variants.tap;
  }

  return (
    <motion.div
      variants={variants}
      initial="rest"
      animate="rest"
      whileHover={!disableHover ? 'hover' : undefined}
      whileTap={!disableTap ? 'tap' : undefined}
    >
      <IconButton {...iconButtonProps}>{children}</IconButton>
    </motion.div>
  );
}

