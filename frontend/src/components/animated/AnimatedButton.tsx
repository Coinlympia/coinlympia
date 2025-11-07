import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@mui/material';
import { ReactNode } from 'react';
import { buttonVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedButtonProps extends ButtonProps {
  children: ReactNode;
  disableHover?: boolean;
  disableTap?: boolean;
}

export function AnimatedButton({
  children,
  disableHover = false,
  disableTap = false,
  ...buttonProps
}: AnimatedButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Button {...buttonProps}>{children}</Button>;
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
      <Button {...buttonProps}>{children}</Button>
    </motion.div>
  );
}

