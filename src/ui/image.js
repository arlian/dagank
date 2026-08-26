// Shrinking a photo before it is stored. Lives in ui/ because it needs the
// DOM: src/data/ may not touch canvas any more than it may touch the network.

/** Long enough that a QRIS still scans off the screen, small enough to store. */
const MAX_SIDE = 720;

/**
 * An item photo is only ever seen as a tile on the board, so it is stored far
 * smaller than a QRIS: a shop with a hundred of them carries all of them in
 * every backup file.
 */
export const FOTO_SIDE = 400;
export const FOTO_QUALITY = 0.7;

/**
 * A camera photo is several megabytes, and every byte of it would be copied
 * into the backup file as base64. Downscaled and re-encoded it lands around
 * 60kB, which a shop can afford to carry in every export.
 */
export function shrinkToDataUrl(file, maxSide = MAX_SIDE, quality = 0.85) {
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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('gambarGagal'));
    };

    img.src = url;
  });
}
