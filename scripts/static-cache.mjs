// Only generated, content-versioned files are safe to retain across releases.
export const immutableAssetPath=pathname=>/^\/assets\/[\w.-]+-[A-Za-z0-9_-]{8,64}\.(?:js|css|png|jpg|svg)$/.test(pathname);
export const hostedCacheControl=pathname=>immutableAssetPath(pathname)?'public, max-age=31536000, immutable':'no-cache';

// Vercel header rules also apply to 404 responses. Enumerate the actual build
// graph so a plausible but nonexistent hashed URL cannot inherit a year of cache.
export function productionAssetCacheSource(urls){
  const paths=[...new Set(urls)].sort();
  if(!paths.length||paths.some(path=>!immutableAssetPath(path)))throw new Error('Invalid hosted asset cache inventory.');
  const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return '/assets/:file('+paths.map(path=>escape(path.slice('/assets/'.length))).join('|')+')';
}
