// src/hooks/useCountAnimation.ts
// Custom hook for number counting animation

import { useEffect, useState } from 'react';

interface UseCountAnimationOptions {
  duration?: number;
  delay?: number;
}

export const useCountAnimation = (
  end: number,
  options: UseCountAnimationOptions = {}
): number => {
  const { duration = 1000, delay = 0 } = options;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }

    const startTime = Date.now() + delay;
    let animationFrame: number;

    const updateCount = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < 0) {
        // Still in delay period
        animationFrame = requestAnimationFrame(updateCount);
        return;
      }

      if (elapsed < duration) {
        // Calculate progress with easing
        const progress = elapsed / duration;
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        
        setCount(Math.floor(easeProgress * end));
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        // Animation complete
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, delay]);

  return count;
};
