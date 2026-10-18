/**
 * FrescoTrack Asynchronous Processing & Background Tasks Engine
 * Offloads heavy computational workloads (QR batches, image compression, large array slicing)
 * from the main thread using async generators, microtasks, and cooperative time-slicing.
 */

/**
 * Yield execution back to the browser event loop to prevent UI freezing (16ms frame budget)
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 20 });
    } else if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Asynchronously processes an array in chunks without blocking UI frames
 */
export async function processArrayAsync<T, R>(
  items: T[],
  chunkSize: number,
  task: (item: T, index: number) => R,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const globalIndex = i + j;
      results.push(task(chunk[j], globalIndex));
    }

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, total), total);
    }

    // Yield control so main thread can process touch events and maintain 60 FPS
    await yieldToMain();
  }

  return results;
}

/**
 * Asynchronously compress and resize images (e.g. business logos from phone camera)
 * Prevents main-thread locks on 8MB+ smartphone photos.
 */
export async function compressImageAsync(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('FileReader empty'));
        return;
      }

      // Yield before canvas decode
      await yieldToMain();

      const img = new Image();
      img.onerror = reject;
      img.onload = async () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Yield before encoding
          await yieldToMain();

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn('Canvas compression fallback', canvasErr);
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
