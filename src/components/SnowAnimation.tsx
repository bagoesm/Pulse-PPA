import React, { useEffect, useState } from 'react';

interface Snowflake {
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

interface SnowAnimationProps {
  isActive: boolean;
  flakeCount?: number;
}

const SnowAnimation: React.FC<SnowAnimationProps> = ({
  isActive,
  flakeCount = 50
}) => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    if (!isActive) {
      setSnowflakes([]);
      return;
    }

    // Generate initial snowflakes
    const initialSnowflakes: Snowflake[] = Array.from({ length: flakeCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      y: -10 - Math.random() * 50, // start above container, staggered
      rotation: Math.random() * 360,
      rotationSpeed: 0.2 + Math.random() * 0.8, // slower rotation for snow
      fallSpeed: 0.1 + Math.random() * 0.3, // slower fall speed for realistic snow
      swaySpeed: 0.01 + Math.random() * 0.02, // gentle sway
      swayAmount: 1 + Math.random() * 2, // subtle horizontal movement
      size: 0.3 + Math.random() * 0.7, // varied sizes
      opacity: 0.4 + Math.random() * 0.6
    }));

    setSnowflakes(initialSnowflakes);

    let animationFrame: number;
    let frameCount = 0;

    const animate = () => {
      frameCount++;

      setSnowflakes(prevSnowflakes => {
        return prevSnowflakes.map(flake => {
          // Update position
          const newY = flake.y + flake.fallSpeed;
          const swayOffset = Math.sin(frameCount * flake.swaySpeed) * flake.swayAmount;
          const newX = flake.x + swayOffset * 0.05; // subtle horizontal drift
          const newRotation = flake.rotation + flake.rotationSpeed;

          // Reset snowflake if it falls below container
          if (newY > 110) {
            return {
              ...flake,
              x: Math.random() * 100,
              y: -10 - Math.random() * 20,
              rotation: Math.random() * 360
            };
          }

          return {
            ...flake,
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
  }, [isActive, flakeCount]);

  if (!isActive || snowflakes.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {snowflakes.map(flake => (
        <div
          key={flake.id}
          className="absolute transition-none"
          style={{
            left: `${flake.x}%`,
            top: `${flake.y}%`,
            transform: `rotate(${flake.rotation}deg) scale(${flake.size})`,
            opacity: flake.opacity,
            width: '24px',
            height: '24px'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            className="w-full h-full drop-shadow-sm"
          >
            <path
              fill="#b8e2ff"
              d="M49.99 29.168a2.995 2.995 0 0 0-5.111-2.29L42.758 29h-1.185A4.918 4.918 0 0 0 42 27a4.344 4.344 0 0 0-.058-.7l.3-.3H45a2.993 2.993 0 0 0 2.231-4.995 3 3 0 0 0-4.236-4.236A2.993 2.993 0 0 0 38 19v2.757l-.3.3a4.677 4.677 0 0 0-2.7.37v-1.185l2.121-2.12a2.995 2.995 0 0 0-2.289-5.111 3 3 0 0 0-5.664 0 2.996 2.996 0 0 0-2.29 5.11L29 21.242v1.185a4.69 4.69 0 0 0-2.7-.37l-.3-.3V19a2.993 2.993 0 0 0-4.995-2.231 3 3 0 0 0-4.236 4.236A2.993 2.993 0 0 0 19 26h2.758l.3.3A4.344 4.344 0 0 0 22 27a4.918 4.918 0 0 0 .427 2h-1.185l-2.12-2.121a2.995 2.995 0 0 0-5.112 2.289 3 3 0 0 0 0 5.664 2.992 2.992 0 0 0 .869 2.29 3.07 3.07 0 0 0 4.242 0L21.242 35h1.185A4.918 4.918 0 0 0 22 37a4.344 4.344 0 0 0 .058.7l-.3.3H19a2.993 2.993 0 0 0-2.231 4.995 3 3 0 0 0 .11 4.126 3.07 3.07 0 0 0 4.126.11A2.993 2.993 0 0 0 26 45v-2.757l.3-.3a4.694 4.694 0 0 0 2.7-.37v1.185l-2.121 2.12a2.995 2.995 0 0 0 2.289 5.111 3 3 0 0 0 5.662.006 3 3 0 0 0 2.291-5.116L35 42.758v-1.185a4.675 4.675 0 0 0 2.7.37l.3.3V45a2.993 2.993 0 0 0 4.995 2.231 3.072 3.072 0 0 0 4.126-.11 3 3 0 0 0 .11-4.126A2.993 2.993 0 0 0 45 38h-2.758l-.3-.3A4.344 4.344 0 0 0 42 37a4.918 4.918 0 0 0-.427-2h1.185l2.12 2.121a3.072 3.072 0 0 0 4.243 0 2.993 2.993 0 0 0 .87-2.289 3 3 0 0 0 0-5.664ZM32 39a7 7 0 1 1 7-7 7.008 7.008 0 0 1-7 7Z"
            />
            <path
              fill="#90caf9"
              d="M52 32a3 3 0 0 1-2.01 2.83 2.971 2.971 0 0 1-.87 2.29 3.075 3.075 0 0 1-4.24 0L42.76 35h-1.19a4.926 4.926 0 0 1 .43 2 4.228 4.228 0 0 1-.06.7l.3.3H45a2.995 2.995 0 0 1 2.23 5 2.988 2.988 0 0 1-.11 4.12 3.057 3.057 0 0 1-4.12.11A2.995 2.995 0 0 1 38 45v-2.76l-.3-.3a4.65 4.65 0 0 1-2.7-.37v1.19l2.12 2.12A3.004 3.004 0 0 1 34.83 50a3 3 0 0 1-5.66-.01 2.995 2.995 0 0 1-2.29-5.11L29 42.76v-1.19a4.65 4.65 0 0 1-2.7.37l-.3.3V45a2.995 2.995 0 0 1-5 2.23 3.057 3.057 0 0 1-4.12-.11 2.946 2.946 0 0 1-.85-1.69 68.37 68.37 0 0 0 12.8-7.19A6.897 6.897 0 0 0 32 39a7.008 7.008 0 0 0 7-7 6.833 6.833 0 0 0-.68-2.99 29.107 29.107 0 0 0 5.41-12.73 3.008 3.008 0 0 1 3.39.6 2.988 2.988 0 0 1 .11 4.12A2.995 2.995 0 0 1 45 26h-2.76l-.3.3a4.227 4.227 0 0 1 .06.7 4.926 4.926 0 0 1-.43 2h1.19l2.12-2.12a2.995 2.995 0 0 1 5.11 2.29A3 3 0 0 1 52 32Z"
            />
            <ellipse
              cx="19"
              cy="19"
              fill="#e6f6ff"
              rx="2"
              ry="1.414"
              transform="rotate(-45 19 19)"
            />
            <circle
              cx="18"
              cy="23"
              r="1"
              fill="#e6f6ff"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

// Custom comparator to only re-render when isActive or flakeCount changes
export default React.memo(SnowAnimation, (prevProps, nextProps) => {
  return prevProps.isActive === nextProps.isActive &&
    prevProps.flakeCount === nextProps.flakeCount;
});