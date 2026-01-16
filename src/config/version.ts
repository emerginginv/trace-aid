// Application version tracking for deployment verification
// Update this when deploying to ensure Lovable/Git/Vercel alignment
export const APP_VERSION = '2026.01.16.002';
export const BUILD_DATE = '2026-01-16';
export const BUILD_TIME = new Date().toISOString();
export const GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT || 'unknown';
