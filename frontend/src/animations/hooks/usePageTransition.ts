import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAnimation } from './useAnimation';

export function usePageTransition() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { shouldAnimate } = useAnimation();

  useEffect(() => {
    const handleRouteChangeStart = () => {
      if (shouldAnimate()) {
        setIsTransitioning(true);
      }
    };

    const handleRouteChangeComplete = () => {
      setIsTransitioning(false);
    };

    const handleRouteChangeError = () => {
      setIsTransitioning(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router, shouldAnimate]);

  return {
    isTransitioning,
  };
}

