/**
 * Jogi oldalak — a teljes szöveg a FastAPI-ból (IMPRINT_* env), nem a SPA-ból.
 * @see backend/routers/legal.py
 */
import { API_BASE_URL } from './apiBaseUrl';

export const legalUrls = {
  privacy: `${API_BASE_URL}/api/legal/privacy`,
  terms: `${API_BASE_URL}/api/legal/terms`,
  aszf: `${API_BASE_URL}/api/legal/aszf`,
  imprint: `${API_BASE_URL}/api/legal/imprint`,
  legalNotice: `${API_BASE_URL}/api/legal/jogi-nyilatkozat`,
} as const;
