import { useReducedMotion } from './useReducedMotion';
import { modalVariants } from '../variants';
import { motion } from 'framer-motion';

export function useAnimatedDialog() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {
      PaperProps: {},
    };
  }

  return {
    PaperProps: {
      component: motion.div,
      variants: modalVariants,
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
    },
  };
}

