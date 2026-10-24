// Loopback-only preview of the current built frontend and read-only data APIs.
process.env.XEDO_FRONTEND_MODE='hosted';
process.env.PORT=process.env.PORT||'5180';
await import('../server.mjs');
