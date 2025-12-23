import React, { useEffect, useState } from 'react';

interface SakuraPetal {
  id: number;
  x: number;
  y: number;
  rotation: number;
  rotationSpeed: number;
  fallSpeed: number;
  swaySpeed: number;
  swayAmount: number;
  size: number;
  opacity: number;
}

interface SakuraAnimationProps {
  isActive: boolean;
  petalCount?: number;
}

const SakuraAnimation: React.FC<SakuraAnimationProps> = ({
  isActive,
  petalCount = 10
}) => {
  const [petals, setPetals] = useState<SakuraPetal[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPetals([]);
      return;
    }

    // Generate initial petals
    const initialPetals: SakuraPetal[] = Array.from({ length: petalCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      y: -10 - Math.random() * 20, // start above container
      rotation: Math.random() * 360,
      rotationSpeed: 0.5 + Math.random() * 1.5, // degrees per frame
      fallSpeed: 0.2 + Math.random() * 0.5, // percentage per frame
      swaySpeed: 0.02 + Math.random() * 0.03, // for sine wave
      swayAmount: 2 + Math.random() * 4, // horizontal sway amount
      size: 0.8 + Math.random() * 0.4, // scale multiplier
      opacity: 0.6 + Math.random() * 0.4
    }));

    setPetals(initialPetals);

    let animationFrame: number;
    let frameCount = 0;

    const animate = () => {
      frameCount++;

      setPetals(prevPetals => {
        return prevPetals.map(petal => {
          // Update position
          const newY = petal.y + petal.fallSpeed;
          const swayOffset = Math.sin(frameCount * petal.swaySpeed) * petal.swayAmount;
          const newX = petal.x + swayOffset * 0.1;
          const newRotation = petal.rotation + petal.rotationSpeed;

          // Reset petal if it falls below container
          if (newY > 110) {
            return {
              ...petal,
              x: Math.random() * 100,
              y: -10 - Math.random() * 20,
              rotation: Math.random() * 360
            };
          }

          return {
            ...petal,
            x: Math.max(0, Math.min(100, newX)), // keep within bounds
            y: newY,
            rotation: newRotation
          };
        });
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isActive, petalCount]);

  if (!isActive || petals.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {petals.map(petal => (
        <div
          key={petal.id}
          className="absolute transition-none"
          style={{
            left: `${petal.x}%`,
            top: `${petal.y}%`,
            transform: `rotate(${petal.rotation}deg) scale(${petal.size})`,
            opacity: petal.opacity,
            width: '16px',
            height: '16px'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="w-full h-full drop-shadow-sm"
          >
            <path
              fill="#fcb6bf"
              d="M453.06,209.48c-4.75-18.73,36.8-60.04,4.02-87.86c-30.73-26.08-79.36,3.09-108.7,37.45
              c27.26-39.36,45.79-88.4,14.33-126.32c-19.52-23.53-79.62,20.56-115.32,9.58c-14.53-4.47-55.96-50.22-77.5,0
              c-16.22,37.82,5.24,72.74,23.73,114.33c-36.66-45.5-83.44-56.08-102.11-53.73c-25.36,3.18-55.9,31.52-39.62,70.86
              c16.28,39.34-33.14,9.37-42.5,77.25c-7.83,56.74,93.63,46.7,127.14,41.87c-41.47,10.37-86.65,32.5-90.7,79.71
              c-5.07,59.13,62.02,27.41,70.45,54.57c8.43,27.16,0.43,86.55,59.43,53.77c55.83-31.01,68.5-81.57,72.29-105.49
              c8.83,74.08,56.01,126.64,78.03,123.43c30.25-4.42,19.83-36.93,53.17-53.78c13.56-6.85,79.57-4.96,70.18-58.79
              c-7.5-42.94-41.63-60.13-80.19-76.98c54.72,17.2,99.79,12.19,115.97-23.52C513.83,222.51,457.81,228.21,453.06,209.48z"
            />
            <path
              fill="#ff889c"
              d="M256.01 223.21c-.66 0-1.33-.08-2-.25-4.28-1.1-6.85-5.46-5.75-9.74 8.78-34.12 4.77-87.12 4.73-87.65-.34-4.4 2.95-8.25 7.35-8.6 4.41-.35 8.25 2.94 8.6 7.35.18 2.28 4.27 56.17-5.19 92.89C262.82 220.81 259.57 223.21 256.01 223.21zM311.49 262.7c-2.24 0-3.64-.03-3.98-.04-4.42-.11-7.91-3.77-7.8-8.19.11-4.42 3.81-7.89 8.19-7.81 14.62.36 56.32-1.17 73.45-12.24 3.71-2.4 8.66-1.33 11.06 2.38 2.4 3.71 1.33 8.66-2.38 11.06C368.78 261.6 324.99 262.7 311.49 262.7zM330.36 398.86c-1.94 0-3.89-.7-5.43-2.12-22.25-20.56-47.97-79.29-49.06-81.78-1.76-4.05.09-8.76 4.14-10.53 4.05-1.76 8.76.09 10.53 4.14.25.58 25.45 58.13 45.24 76.41 3.25 3 3.45 8.06.45 11.3C334.66 398 332.52 398.86 330.36 398.86zM164.14 377.57c-1.3 0-2.61-.32-3.83-.98-3.88-2.12-5.3-6.98-3.18-10.86 10.24-18.7 56.46-67.73 58.42-69.81 3.03-3.21 8.1-3.36 11.31-.32 3.21 3.03 3.36 8.1.32 11.31-12.98 13.74-48.34 52.48-56.02 66.51C169.71 376.07 166.97 377.57 164.14 377.57zM206.94 245.28c-1.19 0-2.4-.27-3.54-.83-.43-.21-43.67-21.5-67.53-25.19-4.37-.67-7.36-4.76-6.69-9.13.67-4.37 4.76-7.36 9.13-6.69 26.3 4.06 70.33 25.74 72.19 26.66 3.96 1.96 5.58 6.76 3.62 10.72C212.73 243.64 209.89 245.28 206.94 245.28z"
            />
            <path
              fill="#fc6081"
              d="M203.81,236.11c0,0,0.84-27.62,35.86-26.6s69.8,19.43,71.85,44.49s-24.55,85.42-62.4,64.96
              C211.27,298.51,195.32,284.19,203.81,236.11z"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

// Custom comparator to only re-render when isActive or petalCount changes
export default React.memo(SakuraAnimation, (prevProps, nextProps) => {
  return prevProps.isActive === nextProps.isActive &&
    prevProps.petalCount === nextProps.petalCount;
});