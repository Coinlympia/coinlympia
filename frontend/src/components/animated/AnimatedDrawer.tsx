import { motion, AnimatePresence } from 'framer-motion';
import { Drawer, DrawerProps } from '@mui/material';
import { ReactNode } from 'react';
import { drawerVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedDrawerProps extends DrawerProps {
  children: ReactNode;
  open: boolean;
}

export function AnimatedDrawer({
  children,
  open,
  onClose,
  anchor = 'left',
  ...drawerProps
}: AnimatedDrawerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        anchor={anchor}
        {...drawerProps}
      >
        {children}
      </Drawer>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <Drawer
          open={open}
          onClose={onClose}
          anchor={anchor}
          {...drawerProps}
          PaperProps={{
            component: motion.div,
            variants: drawerVariants,
            initial: 'hidden',
            animate: 'visible',
            exit: 'hidden',
            ...drawerProps.PaperProps,
          }}
        >
          {children}
        </Drawer>
      )}
    </AnimatePresence>
  );
}

