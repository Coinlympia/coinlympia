import { motion } from 'framer-motion';
import { Tabs, TabsProps } from '@mui/material';
import { ReactNode } from 'react';
import { tabVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedTabsProps extends TabsProps {
  children: ReactNode;
}

export function AnimatedTabs({
  children,
  ...tabsProps
}: AnimatedTabsProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Tabs {...tabsProps}>{children}</Tabs>;
  }

  return (
    <motion.div
      variants={tabVariants}
      initial="hidden"
      animate="visible"
    >
      <Tabs {...tabsProps}>{children}</Tabs>
    </motion.div>
  );
}

