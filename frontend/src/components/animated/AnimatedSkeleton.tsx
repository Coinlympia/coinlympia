import { DURATION, EASING } from '@/animations/constants';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { Skeleton, SkeletonProps } from '@mui/material';
import { motion } from 'framer-motion';

interface AnimatedSkeletonProps extends SkeletonProps { }

export function AnimatedSkeleton(props: AnimatedSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Skeleton {...props} />;
  }

  const MotionSkeleton = motion(Skeleton);

  return (
    <MotionSkeleton
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: DURATION.normal / 1000,
        ease: EASING.easeInOut,
        repeat: Infinity,
      }}
      {...props}
    />
  );
}

