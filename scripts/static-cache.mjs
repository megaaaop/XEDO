// Only generated, content-versioned files are safe to retain across releases.
export const immutableAssetPath=pathname=>/^\/assets\/[\w.-]+-[A-Za-z0-9_-]{8,64}\.(?:js|css|png|jpg|svg)$/.test(pathname);
export const hostedCacheControl=pathname=>immutableAssetPath(pathname)?'public, max-age=31536000, immutable':'no-cache';
