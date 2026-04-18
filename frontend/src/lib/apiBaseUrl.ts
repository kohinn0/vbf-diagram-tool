/**
 * API bázis URL a fetchhez és jogi linkekhez.
 * - `VITE_API_URL` mindent felülír (build / dev).
 * - Fejlesztői módban (vite dev): alapértelmezés http://localhost:8000.
 * - Éles buildben: https://vbfpremium.hu (ugyanazon a domainen proxyzott /api feltételezve).
 */
function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export const API_BASE_URL: string = (() => {
  const env = import.meta.env.VITE_API_URL;
  if (env != null && String(env).trim() !== '') {
    return trimTrailingSlash(String(env).trim());
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  return 'https://vbfpremium.hu';
})();
