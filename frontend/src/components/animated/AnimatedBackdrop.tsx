import { backdropVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { Backdrop, BackdropProps } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedBackdropProps extends BackdropProps {
  children: ReactNode;
  open: boolean;
}

export function AnimatedBackdrop({
  children,
  open,
  ...backdropProps
}: AnimatedBackdropProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Backdrop open={open} {...backdropProps}>
        {children}
      </Backdrop>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
          }}
        >
          <Backdrop
            open={open}
            {...backdropProps}
          >
            {children}
          </Backdrop>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

