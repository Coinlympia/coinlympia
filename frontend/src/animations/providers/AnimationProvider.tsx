import { createContext, ReactNode, useContext } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimationContextValue {
  prefersReducedMotion: boolean;
}

const AnimationContext = createContext<AnimationContextValue>({
  prefersReducedMotion: false,
});

interface AnimationProviderProps {
  children: ReactNode;
}

export function AnimationProvider({ children }: AnimationProviderProps) {
  const prefersReducedMotion = useReducedMotion();

  const value: AnimationContextValue = {
    prefersReducedMotion,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimationContext(): AnimationContextValue {
  const context = useContext(AnimationContext);
  if (!context || typeof context !== 'object' || !('prefersReducedMotion' in context)) {
    throw new Error(
      'useAnimationContext must be used within an AnimationProvider',
    );
  }
  return context as AnimationContextValue;
}

