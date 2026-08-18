// Shrinking a photo before it is stored. Lives in ui/ because it needs the
// DOM: src/data/ may not touch canvas any more than it may touch the network.

/** Long enough that a QRIS still scans off the screen, small enough to store. */
const MAX_SIDE = 720;

/**
 * A camera photo is several megabytes, and every byte of it would be copied
 * into the backup file as base64. Downscaled and re-encoded it lands around
 * 60kB, which a shop can afford to carry in every export.
 */
export function shrinkToDataUrl(file, maxSide = MAX_SIDE) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('gambarGagal'));
    };

    img.src = url;
  });
}
