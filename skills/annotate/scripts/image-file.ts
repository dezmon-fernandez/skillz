import { extname, resolve, sep } from 'node:path';

// No SVG: opened directly, an SVG runs its scripts on the page's origin, where the comments are kept.
const IMAGE_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// The file an image path in a document points at, only when it is an image inside the document's folder.
export function imageFile(folder: string, requested: string): { path: string; type: string } | null {
  const root = resolve(folder);
  const path = resolve(root, requested);
  const type = IMAGE_TYPES[extname(path).toLowerCase()];
  return type && path.startsWith(root + sep) ? { path, type } : null;
}
