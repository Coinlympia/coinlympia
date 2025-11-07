import { useReducedMotion } from './useReducedMotion';
import { DURATION, EASING } from '../constants';

export function useAnimation() {
  const prefersReducedMotion = useReducedMotion();

  const getDuration = (duration: number): number => {
    return prefersReducedMotion ? 0 : duration;
  };

  const getTransition = (duration: number = DURATION.normal) => {
    if (prefersReducedMotion) {
      return { duration: 0 };
    }
    return {
      duration: duration / 1000,
      ease: EASING.easeOut,
    };
  };

  const shouldAnimate = (): boolean => {
    return !prefersReducedMotion;
  };

  return {
    prefersReducedMotion,
    getDuration,
    getTransition,
    shouldAnimate,
  };
}

