// Application version tracking for deployment verification
// Update APP_VERSION when deploying to ensure Lovable/Git/Vercel alignment

// These are injected at build time by Vite
declare const __BUILD_TIME__: string;
declare const __GIT_COMMIT__: string;

export const APP_VERSION = '2026.01.16.004';
export const BUILD_DATE = '2026-01-16';

export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' 
  ? __BUILD_TIME__ 
  : new Date().toISOString();

export const GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined' 
  ? __GIT_COMMIT__ 
  : 'local-dev';
