import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { listVariants, listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={listItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}


