import { DURATION, EASING } from '@/animations/constants';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { CircularProgress, CircularProgressProps } from '@mui/material';
import { motion } from 'framer-motion';

interface AnimatedCircularProgressProps extends CircularProgressProps { }

export function AnimatedCircularProgress(props: AnimatedCircularProgressProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <CircularProgress {...props} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: DURATION.fast / 1000,
        ease: EASING.easeInOut,
      }}
    >
      <CircularProgress {...props} />
    </motion.div>
  );
}

