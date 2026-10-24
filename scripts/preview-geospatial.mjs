// Local-only preview. Google credentials remain in the optional ignored .env.
process.env.XEDO_FRONTEND_MODE='hosted';
process.env.PORT=process.env.PORT||'5182';
await import('../server.mjs');