import React from 'react';

interface ChristmasDecorationsProps {
  santaHatEnabled: boolean;
  baubleEnabled: boolean;
  candyEnabled: boolean;
  position?: 'avatar' | 'card-top' | 'card-bottom';
  className?: string;
}

// Inline SVG Components - Enhanced with multiple variants
const SantaHatSVG = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="none">
    <defs>
      <linearGradient id="santaHatGradient1">
        <stop offset="0" stopColor="#fd4755"/>
        <stop offset="1" stopColor="#ca2e43"/>
      </linearGradient>
      <linearGradient id="santaHatGradient2">
        <stop offset="0" stopColor="#eaf9fa"/>
        <stop offset="1" stopColor="#b3dafe"/>
      </linearGradient>
      <radialGradient id="santaHatPomPom">
        <stop offset="0" stopColor="#fef0ae"/>
        <stop offset="1" stopColor="#fac600"/>
      </radialGradient>
    </defs>
    {/* Main Hat Body */}
    <path fill="url(#santaHatGradient1)" d="m453.2 483.9c1.5-4.7 31.6-122.5-131.4-200.3l92.3-198c163.2 79.8 41.7 391.6 39.1 398.3z"/>
    <path fill="url(#santaHatGradient1)" d="m410.6 356.8-373.9-174.3s55.1-100.9 135.4-165.3c26.9-21.6 60.1-22.9 82.3-3.6 18.2 15.8 40.7 30.8 68.2 43.7 27.5 12.8 53.5 20.4 77.3 24.2 29.1 4.7 49.4 30.9 50.2 65.4 2.4 102.8-39.5 209.9-39.5 209.9z"/>
    {/* Hat Fur Trim */}
    <path fill="url(#santaHatGradient2)" d="m392.4 314.4c-.8-.4-1.5-.9-2.3-1.3-10.7-5.6-18.7-15.2-23-26.5-6.7-17.7-20.1-32.9-38.6-41.5-8.5-4-17.4-6.2-26.3-6.9-12-.9-23.4-5.9-31.4-14.9-5.2-5.7-11.5-10.5-19-14-7.4-3.5-15.2-5.3-22.9-5.5-12-.4-23.2-5.9-31.6-14.5-6.2-6.4-13.6-11.7-22.2-15.7-18.5-8.6-38.7-9.1-56.6-2.9-11.4 4-24 4-35.1-.6-.8-.3-1.6-.6-2.4-.9-27.6-10-58.8 2-72.6 27.8-16.2 30.3-3.5 67.6 27.3 82 7.9 3.7 16.1 5.5 24.2 5.6 12.2.2 23.7 5.4 32.7 13.6 5.4 4.9 11.7 9.1 18.7 12.4 17.5 8.2 36.6 9 53.8 3.8 11.9-3.6 24.7-2.8 36 2.6.2.1.3.2.5.2s.3.2.5.2c11.4 5.2 20.2 14.4 25.1 25.9 7 16.5 20 30.6 37.5 38.8 7 3.3 14.3 5.4 21.5 6.4 12.1 1.7 23.5 7.1 31.4 16.4 5.3 6.2 12 11.3 19.9 15 30.8 14.3 67.5.1 80.3-31.8 10.9-27.4 0-59-25.4-73.7z"/>
    {/* Pom Pom */}
    <circle cx="456.3" cy="456.1" r="54.4" fill="url(#santaHatPomPom)"/>
  </svg>
);

// Multiple Bauble variants with different colors
const BaubleSVG = ({ className, variant = 'gold' }: { className?: string; variant?: 'gold' | 'red' | 'green' }) => {
  const getGradients = () => {
    switch (variant) {
      case 'red':
        return {
          main: (
            <radialGradient id={`baubleMain-${variant}`} cx="256" cy="256" r="120">
              <stop offset="0" stopColor="#ff6b6b"/>
              <stop offset=".2" stopColor="#ff5252"/>
              <stop offset=".4" stopColor="#f44336"/>
              <stop offset=".6" stopColor="#e53935"/>
              <stop offset=".8" stopColor="#d32f2f"/>
              <stop offset="1" stopColor="#c62828"/>
            </radialGradient>
          )
        };
      case 'green':
        return {
          main: (
            <radialGradient id={`baubleMain-${variant}`} cx="256" cy="256" r="120">
              <stop offset="0" stopColor="#81c784"/>
              <stop offset=".2" stopColor="#66bb6a"/>
              <stop offset=".4" stopColor="#4caf50"/>
              <stop offset=".6" stopColor="#43a047"/>
              <stop offset=".8" stopColor="#388e3c"/>
              <stop offset="1" stopColor="#2e7d32"/>
            </radialGradient>
          )
        };
      default: // gold
        return {
          main: (
            <radialGradient id={`baubleMain-${variant}`} cx="256" cy="256" r="120">
              <stop offset="0" stopColor="#fef0ae"/>
              <stop offset=".2" stopColor="#fdeea7"/>
              <stop offset=".4" stopColor="#fdea96"/>
              <stop offset=".6" stopColor="#fce37a"/>
              <stop offset=".8" stopColor="#fbda53"/>
              <stop offset="1" stopColor="#fac600"/>
            </radialGradient>
          )
        };
    }
  };

  return (
    <svg className={className} viewBox="0 0 512 512" fill="none">
      <defs>
        <linearGradient id="capGradient">
          <stop offset="0" stopColor="#efe2dd"/>
          <stop offset=".5" stopColor="#d9ceca"/>
          <stop offset="1" stopColor="#9e9797"/>
        </linearGradient>
        <linearGradient id="hookGradient">
          <stop offset="0" stopColor="#9e9797"/>
          <stop offset="1" stopColor="#766e6e"/>
        </linearGradient>
        {getGradients().main}
        <linearGradient id="shineGradient">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.8"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.2"/>
        </linearGradient>
      </defs>
      
      {/* Bauble Hook */}
      <rect x="251" y="20" width="10" height="25" rx="5" fill="url(#hookGradient)"/>
      
      {/* Bauble Cap */}
      <rect x="229" y="40" width="54" height="30" rx="4" fill="url(#capGradient)"/>
      <rect x="233" y="44" width="46" height="22" rx="2" fill="url(#hookGradient)" opacity="0.3"/>
      
      {/* Main Bauble Body - Perfect Circle */}
      <circle cx="256" cy="256" r="120" fill={`url(#baubleMain-${variant})`}/>
      
      {/* Shine Effects */}
      <ellipse cx="220" cy="200" rx="25" ry="40" fill="url(#shineGradient)" opacity="0.6"/>
      <ellipse cx="280" cy="220" rx="15" ry="25" fill="url(#shineGradient)" opacity="0.4"/>
      <circle cx="210" cy="280" r="20" fill="url(#shineGradient)" opacity="0.3"/>
      <circle cx="300" cy="300" r="12" fill="url(#shineGradient)" opacity="0.5"/>
      
      {/* Top highlight */}
      <ellipse cx="256" cy="180" rx="35" ry="15" fill="url(#shineGradient)" opacity="0.7"/>
    </svg>
  );
};

const CandySVG = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    {/* First Candy Cane */}
    <path d="M41.97,15.93l-3.09-1.15l-0.55-3.02c-0.06-0.29-0.27-0.53-0.56-0.61l-2.67-0.73l-0.91-3.48c-0.07-0.26-0.27-0.46-0.53-0.54
		c-0.25-0.08-0.53-0.02-0.74,0.15l-1.98,1.72c-1.42,1.23-2.28,2.96-2.42,4.85c-0.03,0.44-0.01,0.88,0.04,1.31
		c-0.92-0.44-1.9-0.76-2.92-0.91h-0.03c0,0-0.01,0-0.02,0c-0.72-0.11-1.44-0.13-2.14-0.08c-1.19,0.09-2.33,0.37-3.36,0.84
		c-0.67,0.29-1.31,0.66-1.9,1.1c-0.22,0.16-0.43,0.33-0.64,0.51l-5.87,5.09c-0.22,0.2-0.44,0.39-0.62,0.59
		c-0.64,0.64-1.19,1.39-1.66,2.24c-0.67,1.27-1.08,2.68-1.17,4.09c-0.1,1.29,0.08,2.57,0.47,3.78c-0.44-0.12-0.87-0.2-1.32-0.23
		c-1.84-0.14-3.72,0.48-5.13,1.71l-1.98,1.71c-0.2,0.18-0.3,0.45-0.26,0.72c0.04,0.26,0.22,0.49,0.47,0.59l3.31,1.4l0.34,2.74
		c0.04,0.3,0.25,0.55,0.53,0.64l2.92,0.99l0.7,3.2c0.06,0.27,0.26,0.49,0.52,0.58c0.08,0.02,0.16,0.04,0.24,0.04
		c0.19,0,0.37-0.07,0.52-0.19l1.97-1.72c1.81-1.56,2.65-3.88,2.38-6.16c0.82,0.39,1.68,0.69,2.57,0.85c0.6,0.11,1.2,0.17,1.79,0.17
		c0.31,0,0.61-0.02,0.91-0.05c1.56-0.13,3.02-0.6,4.35-1.41c0.5-0.3,0.97-0.65,1.39-1.02l5.87-5.09c0.61-0.53,1.15-1.11,1.58-1.73
		c0.41-0.56,0.75-1.16,1.05-1.83v-0.01c0.01-0.01,0.01-0.02,0.02-0.03c0.46-1.06,0.73-2.17,0.81-3.32c0.09-1.28-0.08-2.55-0.47-3.77
		c0.6,0.16,1.21,0.24,1.81,0.24c1.67,0,3.32-0.59,4.64-1.73l1.98-1.72c0.21-0.18,0.31-0.45,0.26-0.73
		C42.42,16.25,42.23,16.03,41.97,15.93z M10.51,42.68l-0.99,0.86l-0.51-2.36c-0.06-0.27-0.26-0.49-0.52-0.57l-2.87-0.97l-0.34-2.7
		c-0.03-0.28-0.21-0.52-0.47-0.62l-2.57-1.09l1.03-0.89c1.1-0.96,2.56-1.45,4-1.34c0.81,0.06,1.6,0.3,2.31,0.7
		c0.31,0.53,0.67,1.05,1.09,1.54c0.4,0.46,0.86,0.89,1.37,1.29C12.87,38.7,12.28,41.15,10.51,42.68z M16.76,37.01
		c-1.29-0.23-2.49-0.75-3.55-1.54c-0.02-0.01-0.03-0.02-0.05-0.03c-0.49-0.38-0.93-0.79-1.31-1.23c-0.41-0.47-0.75-0.96-1.02-1.46
		c-0.01-0.02-0.02-0.03-0.03-0.05c-0.78-1.42-1.13-3.04-1.02-4.7c0.08-1.18,0.43-2.38,1-3.45c0.12-0.23,0.27-0.44,0.41-0.65
		c0.86,3.59,2.64,8.33,6.31,13.2C17.26,37.08,17.01,37.06,16.76,37.01z M22.72,35.93c-1.01,0.61-2.1,0.98-3.26,1.13
		c-4.44-5.52-6.26-10.94-7-14.67c0.09-0.08,0.16-0.16,0.25-0.23l2.75-2.39c0.95,4.19,3.13,9.9,8.04,15.59
		C23.24,35.56,22.99,35.76,22.72,35.93z M24.7,34.37c-5.05-5.85-7.09-11.7-7.89-15.77l1.76-1.53c0.18-0.16,0.36-0.3,0.54-0.43
		c0.24-0.18,0.49-0.34,0.74-0.49c0.95,4.12,3.13,9.81,8.02,15.47L24.7,34.37z M31.1,28.51c-0.37,0.52-0.82,1.02-1.33,1.46
		l-0.72,0.62c-4.82-5.57-6.88-11.16-7.75-15.11c0.71-0.26,1.47-0.42,2.26-0.48c0.46-0.04,0.92-0.02,1.38,0.02
		c1.43,4.45,3.73,8.59,6.86,12.32C31.59,27.75,31.37,28.15,31.1,28.51z M32.69,24.12c-0.03,0.52-0.12,1.04-0.25,1.54
		c-2.53-3.16-4.45-6.61-5.74-10.29c0.94,0.28,1.82,0.72,2.6,1.31c0.5,0.38,0.94,0.8,1.33,1.24c0.39,0.45,0.74,0.95,1.04,1.48
		C32.46,20.85,32.81,22.48,32.69,24.12z M39.21,17.79c-1.77,1.53-4.29,1.77-6.32,0.63c-0.32-0.54-0.68-1.06-1.08-1.52
		c-0.4-0.46-0.87-0.9-1.37-1.3c-0.29-0.76-0.42-1.56-0.36-2.37c0.1-1.48,0.77-2.82,1.89-3.78L33,8.55l0.7,2.7
		c0.07,0.27,0.28,0.48,0.55,0.56l2.63,0.72l0.55,2.97c0.05,0.27,0.24,0.49,0.49,0.59l2.27,0.84L39.21,17.79z" fill="#333"/>
    
    {/* Gray/White sections */}
    <path fill="#e1e2de" d="M17.5 37.1c-.24-.02-.49-.04-.74-.09-1.29-.23-2.49-.75-3.55-1.54-.02-.01-.03-.02-.05-.03-.49-.38-.93-.79-1.31-1.23-.41-.47-.75-.96-1.02-1.46-.01-.02-.02-.03-.03-.05-.78-1.42-1.13-3.04-1.02-4.7.08-1.18.43-2.38 1-3.45.12-.23.27-.44.41-.65C12.05 27.49 13.83 32.23 17.5 37.1zM27.87 31.62l-3.17 2.75c-5.05-5.85-7.09-11.7-7.89-15.77l1.76-1.53c.18-.16.36-.3.54-.43.24-.18.49-.34.74-.49C20.8 20.27 22.98 25.96 27.87 31.62zM32.69 24.12c-.03.52-.12 1.04-.25 1.54-2.53-3.16-4.45-6.61-5.74-10.29.94.28 1.82.72 2.6 1.31.5.38.94.8 1.33 1.24.39.45.74.95 1.04 1.48C32.46 20.85 32.81 22.48 32.69 24.12z"/>
    
    {/* Yellow sections */}
    <path fill="#fad041" d="M31.8 27.34c-.21.41-.43.81-.7 1.17-.37.52-.82 1.02-1.33 1.46l-.72.62c-4.82-5.57-6.88-11.16-7.75-15.11.71-.26 1.47-.42 2.26-.48.46-.04.92-.02 1.38.02C26.37 19.47 28.67 23.61 31.8 27.34zM23.5 35.36c-.26.2-.51.4-.78.57-1.01.61-2.1.98-3.26 1.13-4.44-5.52-6.26-10.94-7-14.67.09-.08.16-.16.25-.23l2.75-2.39C16.41 23.96 18.59 29.67 23.5 35.36zM10.51 42.68l-.99.86-.51-2.36c-.06-.27-.26-.49-.52-.57l-2.87-.97-.34-2.7c-.03-.28-.21-.52-.47-.62l-2.57-1.09 1.03-.89c1.1-.96 2.56-1.45 4-1.34.81.06 1.6.3 2.31.7.31.53.67 1.05 1.09 1.54.4.46.86.89 1.37 1.29C12.87 38.7 12.28 41.15 10.51 42.68zM40.19 16.93l-.98.86c-1.77 1.53-4.29 1.77-6.32.63-.32-.54-.68-1.06-1.08-1.52-.4-.46-.87-.9-1.37-1.3-.29-.76-.42-1.56-.36-2.37.1-1.48.77-2.82 1.89-3.78L33 8.55l.7 2.7c.07.27.28.48.55.56l2.63.72.55 2.97c.05.27.24.49.49.59L40.19 16.93z"/>
    
    {/* Second Candy Cane */}
    <path d="M63.49,27.81l-3.08-1.16l-0.55-3.02c-0.05-0.29-0.27-0.53-0.56-0.61l-2.67-0.74l-0.92-3.47c-0.07-0.26-0.27-0.46-0.52-0.54
		c-0.26-0.08-0.54-0.02-0.75,0.15l-1.97,1.72c-1.43,1.23-2.29,2.95-2.43,4.84c-0.03,0.44-0.01,0.88,0.04,1.32
		c-0.92-0.44-1.9-0.76-2.92-0.91c-0.01,0-0.01,0-0.02,0c-0.01,0-0.01,0-0.02,0c-0.72-0.11-1.44-0.14-2.15-0.08
		c-1.19,0.09-2.32,0.37-3.36,0.84c-0.66,0.29-1.3,0.66-1.9,1.1c-0.21,0.15-0.43,0.33-0.63,0.51l-5.87,5.09
		c-0.23,0.19-0.44,0.39-0.62,0.59c-0.64,0.64-1.2,1.39-1.66,2.24c-0.68,1.27-1.09,2.68-1.18,4.09c-0.09,1.29,0.09,2.56,0.47,3.77
		c-0.43-0.11-0.87-0.2-1.31-0.23c-1.88-0.13-3.71,0.48-5.14,1.72l-1.98,1.72c-0.2,0.17-0.3,0.44-0.26,0.71
		c0.04,0.27,0.22,0.49,0.47,0.6l3.31,1.39l0.35,2.75c0.04,0.29,0.25,0.54,0.53,0.64l2.91,0.97l0.7,3.22
		c0.06,0.27,0.26,0.48,0.52,0.57c0.08,0.03,0.16,0.04,0.25,0.04c0.18,0,0.36-0.07,0.51-0.19l1.98-1.72c1.8-1.56,2.65-3.88,2.37-6.17
		c0.82,0.4,1.69,0.7,2.58,0.86c0.6,0.11,1.2,0.16,1.79,0.16c0.3,0,0.61-0.01,0.91-0.04c1.55-0.13,3.01-0.6,4.34-1.41
		c0.5-0.3,0.97-0.65,1.4-1.02l5.87-5.09c0.61-0.53,1.14-1.11,1.58-1.73c0.4-0.56,0.74-1.16,1.04-1.83l0.01-0.01
		c0-0.01,0.01-0.02,0.01-0.03c0.46-1.06,0.73-2.18,0.81-3.32c0.1-1.28-0.07-2.55-0.46-3.76c0.59,0.15,1.2,0.23,1.8,0.23
		c1.67,0,3.32-0.58,4.64-1.73l1.98-1.71c0.21-0.18,0.31-0.46,0.26-0.73C63.94,28.13,63.75,27.9,63.49,27.81z" fill="#333"/>
    
    {/* Red sections for second candy */}
    <path fill="#fc3021" d="M61.72 28.81l-.99.85c-1.77 1.53-4.28 1.77-6.31.64-.32-.55-.68-1.07-1.08-1.53-.41-.47-.87-.9-1.38-1.31-.29-.74-.42-1.56-.36-2.37.11-1.47.78-2.81 1.89-3.77l1.03-.9.72 2.7c.07.26.27.48.54.55l2.63.73.55 2.97c.05.27.24.49.49.59L61.72 28.81zM32.03 54.55l-.98.86-.52-2.37c-.06-.27-.26-.48-.52-.57l-2.86-.96-.35-2.7c-.03-.28-.21-.51-.47-.62l-2.57-1.09 1.03-.89c1.12-.96 2.54-1.44 4.01-1.34.8.05 1.59.29 2.3.69.31.53.67 1.05 1.1 1.55.39.45.85.88 1.34 1.27C34.4 50.56 33.81 53.02 32.03 54.55zM45.02 47.23c-.25.19-.5.4-.78.57-1 .61-2.09.98-3.26 1.13-4.44-5.52-6.25-10.94-6.99-14.67.08-.08.16-.16.24-.23l2.76-2.39C37.94 35.83 40.11 41.54 45.02 47.23zM53.32 39.21c-.2.41-.43.81-.69 1.17-.37.52-.82 1.01-1.33 1.46l-.72.62c-4.82-5.57-6.89-11.16-7.76-15.11.72-.26 1.48-.43 2.27-.48.45-.04.91-.02 1.38.02C47.9 31.34 50.2 35.48 53.32 39.21z"/>
    
    {/* Gray sections for second candy */}
    <path fill="#e1e2de" d="M54.22 35.99c-.04.52-.13 1.03-.26 1.54-2.52-3.17-4.45-6.62-5.73-10.29.93.28 1.82.72 2.59 1.3.5.39.95.81 1.34 1.25.39.45.73.95 1.03 1.48C53.99 32.72 54.34 34.35 54.22 35.99zM49.4 43.48l-3.17 2.75c-5.06-5.84-7.09-11.7-7.9-15.76l1.77-1.54c.18-.15.36-.29.54-.43.23-.17.48-.33.74-.48C42.33 32.14 44.5 37.83 49.4 43.48zM39.03 48.97c-.25-.03-.49-.04-.74-.09-1.3-.23-2.5-.75-3.56-1.54-.01-.01-.03-.02-.04-.03-.49-.38-.93-.79-1.31-1.23-.41-.46-.75-.96-1.02-1.46-.01-.02-.02-.03-.03-.05-.79-1.42-1.14-3.04-1.02-4.7.08-1.19.42-2.38.99-3.45.13-.23.28-.44.42-.65C33.58 39.36 35.36 44.1 39.03 48.97z"/>
  </svg>
);

const ChristmasDecorations: React.FC<ChristmasDecorationsProps> = ({
  santaHatEnabled,
  baubleEnabled,
  candyEnabled,
  position = 'avatar',
  className = ''
}) => {
  if (position === 'avatar' && santaHatEnabled) {
    return (
      <div className={`absolute -top-2 -right-1 w-8 h-8 z-10 ${className}`}>
        <SantaHatSVG className="w-full h-full transform rotate-12" />
      </div>
    );
  }

  if (position === 'card-top' && baubleEnabled) {
    return (
      <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-1 z-10 ${className}`}>
        <div className="w-8 h-8 animate-bounce" style={{ animationDelay: '0ms' }}>
          <BaubleSVG className="w-full h-full" variant="red" />
        </div>
        <div className="w-7 h-7 animate-bounce" style={{ animationDelay: '100ms' }}>
          <BaubleSVG className="w-full h-full" variant="gold" />
        </div>
        <div className="w-10 h-10 animate-bounce" style={{ animationDelay: '200ms' }}>
          <BaubleSVG className="w-full h-full" variant="green" />
        </div>
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '300ms' }}>
          <BaubleSVG className="w-full h-full" variant="red" />
        </div>
        <div className="w-9 h-9 animate-bounce" style={{ animationDelay: '400ms' }}>
          <BaubleSVG className="w-full h-full" variant="gold" />
        </div>
        <div className="w-7 h-7 animate-bounce" style={{ animationDelay: '500ms' }}>
          <BaubleSVG className="w-full h-full" variant="green" />
        </div>
        <div className="w-8 h-8 animate-bounce" style={{ animationDelay: '600ms' }}>
          <BaubleSVG className="w-full h-full" variant="red" />
        </div>
      </div>
    );
  }

  if (position === 'card-bottom' && candyEnabled) {
    return (
      <div className={`absolute bottom-1 left-0 right-0 flex justify-between items-end z-10 ${className}`}>
        <div className="w-7 h-7 transform rotate-12">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-6 h-6 transform rotate-45">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-8 h-8 transform -rotate-12">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-5 h-5 transform rotate-30">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-9 h-9 transform -rotate-45">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-6 h-6 transform rotate-60">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-7 h-7 transform -rotate-30">
          <CandySVG className="w-full h-full" />
        </div>
        <div className="w-8 h-8 transform rotate-12">
          <CandySVG className="w-full h-full" />
        </div>
      </div>
    );
  }

  return null;
};

export default ChristmasDecorations;