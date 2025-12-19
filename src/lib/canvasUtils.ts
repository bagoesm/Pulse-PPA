// Utility functions for canvas operations

// Add roundRect method if not available
export const addRoundRectSupport = (ctx: CanvasRenderingContext2D) => {
  if (!ctx.roundRect) {
    ctx.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
      this.beginPath();
      this.moveTo(x + radius, y);
      this.lineTo(x + width - radius, y);
      this.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.lineTo(x + width, y + height - radius);
      this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.lineTo(x + radius, y + height);
      this.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      this.closePath();
    };
  }
};

// Load image with CORS support
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Load SVG and convert to image with fallback
export const loadSVGAsImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // Try to load as regular image first (works better in production)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: try to fetch and convert SVG
      fetch(src)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch SVG');
          return response.text();
        })
        .then(svgText => {
          const blob = new Blob([svgText], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            URL.revokeObjectURL(url);
            resolve(fallbackImg);
          };
          fallbackImg.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG'));
          };
          fallbackImg.src = url;
        })
        .catch(reject);
    };
    
    img.src = src;
  });
};

// Get week date range
export const getWeekRange = (date: Date = new Date()) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { startOfWeek, endOfWeek };
};