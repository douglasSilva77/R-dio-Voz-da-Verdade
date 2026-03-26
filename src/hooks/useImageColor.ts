import { useState, useEffect } from 'react';

export function useImageColor(imageUrl: string) {
  console.log("useImageColor.ts: Hook called with imageUrl:", imageUrl);
  const [color, setColor] = useState<string>('#D4AF37'); // Default color

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      console.log("useImageColor.ts: Image loaded, extracting color...");
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          console.warn("useImageColor.ts: Could not get 2D context");
          return;
        }

        // Use a small version of the image for performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0;
        let validCount = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          const pr = imageData[i];
          const pg = imageData[i + 1];
          const pb = imageData[i + 2];
          const pa = imageData[i + 3];

          if (pa < 128) continue; // Skip transparent

          const brightness = (pr * 299 + pg * 587 + pb * 114) / 1000;
          // Skip very dark or very light pixels to get a more "brand" color
          if (brightness > 40 && brightness < 220) {
            r += pr;
            g += pg;
            b += pb;
            validCount++;
          }
        }

        if (validCount > 0) {
          r = Math.floor(r / validCount);
          g = Math.floor(g / validCount);
          b = Math.floor(b / validCount);
        } else {
          // Fallback to average if no mid-range pixels
          r = 0; g = 0; b = 0;
          for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
          }
          const totalCount = imageData.length / 4;
          if (totalCount > 0) {
            r = Math.floor(r / totalCount);
            g = Math.floor(g / totalCount);
            b = Math.floor(b / totalCount);
          } else {
            r = 212; g = 175; b = 55; // Default #D4AF37
          }
        }

        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        console.log("useImageColor.ts: Extracted color:", hex);
        setColor(hex);
      } catch (e) {
        console.error('useImageColor.ts: Error extracting color:', e);
        // Keep default color on error
      }
    };

    img.onerror = (err) => {
      console.error("useImageColor.ts: Error loading image:", err);
    };
  }, [imageUrl]);

  return color;
}
