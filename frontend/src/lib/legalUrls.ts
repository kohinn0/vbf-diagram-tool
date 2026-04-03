/**
 * Jogi oldalak — a teljes szöveg a FastAPI-ból (IMPRINT_* env), nem a SPA-ból.
 * @see backend/routers/legal.py
 */
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const legalUrls = {
  privacy: `${API}/api/legal/privacy`,
  terms: `${API}/api/legal/terms`,
  aszf: `${API}/api/legal/aszf`,
  imprint: `${API}/api/legal/imprint`,
  legalNotice: `${API}/api/legal/jogi-nyilatkozat`,
} as const;
