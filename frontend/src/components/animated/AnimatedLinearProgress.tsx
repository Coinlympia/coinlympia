/**
 * Componente LinearProgress animado
 * Extiende MUI LinearProgress con animaciones de progreso suave
 */

import { motion } from 'framer-motion';
import { LinearProgress, LinearProgressProps } from '@mui/material';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { DURATION, EASING } from '@/animations/constants';

interface AnimatedLinearProgressProps extends LinearProgressProps {}

export function AnimatedLinearProgress(props: AnimatedLinearProgressProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <LinearProgress {...props} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: DURATION.fast / 1000,
        ease: EASING.easeOut,
      }}
    >
      <LinearProgress {...props} />
    </motion.div>
  );
}

