import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { pageTransitionVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedPageProps {
  children: ReactNode;
}

export function AnimatedPage({ children }: AnimatedPageProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
    >
      {children}
    </motion.div>
  );
}

