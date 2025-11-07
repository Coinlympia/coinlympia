import { scaleVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { Select, SelectProps } from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type AnimatedSelectProps = SelectProps & {
  children: ReactNode;
};

export function AnimatedSelect({
  children,
  ...selectProps
}: AnimatedSelectProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Select {...(selectProps as any)}>{children}</Select>;
  }

  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
    >
      <Select {...(selectProps as any)}>{children}</Select>
    </motion.div>
  );
}

