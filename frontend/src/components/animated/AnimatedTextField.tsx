import { DURATION, EASING } from '@/animations/constants';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { TextField, TextFieldProps } from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedTextFieldProps extends Omit<TextFieldProps, 'children'> {
  children?: ReactNode;
}

export function AnimatedTextField({
  children,
  ...textFieldProps
}: AnimatedTextFieldProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <TextField {...textFieldProps}>{children}</TextField>;
  }

  return (
    <motion.div
      whileFocus={{
        scale: 1.01,
        transition: {
          duration: DURATION.fast / 1000,
          ease: EASING.easeOut,
        },
      }}
    >
      <TextField {...textFieldProps}>{children}</TextField>
    </motion.div>
  );
}

