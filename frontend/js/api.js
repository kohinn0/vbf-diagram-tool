/**
 * API Kommunikációs Modul
 * Kezeli a hálózati kéréseket, mentéseket, felhő szinkronizációt.
 */

// A baseUrl lekérdezése a környezetből vagy globális változóból,
// hogy kompatibilis maradhasson az eddigi kóddal az átmeneti időszakban.
const getBaseUrl = () => window.API_BASE_URL || 'http://localhost:8000';
const getToken = () => window.currentToken || localStorage.getItem('vbf_token');

export const API = {
    /**
     * Bejelentkezés a szerverre
     */
    async login(username, password) {
        const url = `${getBaseUrl()}/token`;
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Hibás bejelentkezés!');
        return data.access_token;
    },

    /**
     * Mester Adatok (Ügyfelek, Felülvizsgálók) letöltése
     */
    async getMasterData() {
        const res = await fetch(`${getBaseUrl()}/master-data`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return { customers: [], inspectors: [] };
        return res.json();
    },

    /**
     * Jegyzőkönyv mentése a felhőbe
     */
    async saveReport(payload, reportId = null) {
        const isUpdate = !!reportId;
        const reqMethod = isUpdate ? 'PUT' : 'POST';
        const endpoint = isUpdate ? `/reports/${reportId}` : '/reports';

        const res = await fetch(`${getBaseUrl()}${endpoint}`, {
            method: reqMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Hiba a mentés során');
        return data; // returns the saved report data, including ID
    },

    /**
     * Jegyzőkönyvek listájának lekérése
     */
    async fetchReports() {
        const res = await fetch(`${getBaseUrl()}/reports`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Hiba a listázáskor');
        return res.json();
    },

    /**
     * Egy jegyzőkönyv lekérése ID alapján
     */
    async fetchReportById(reportId) {
        const res = await fetch(`${getBaseUrl()}/reports/${reportId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Nem található a jegyzőkönyv');
        return res.json();
    },

    /**
     * Jegyzőkönyv törlése
     */
    async deleteReport(reportId) {
        const res = await fetch(`${getBaseUrl()}/reports/${reportId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Hiba törléskor');
        return true;
    },

    /**
     * Word export generálása
     */
    async exportWord(reportId) {
        const res = await fetch(`${getBaseUrl()}/reports/${reportId}/export/docx`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Hiba a Word generálás során! (Backend hiba)');
        return res.blob();
    },

    /**
     * PDF export generálása
     */
    async exportPdf(reportId) {
        const res = await fetch(`${getBaseUrl()}/reports/${reportId}/export/pdf`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Hiba a PDF generálás során! (Backend hiba)');
        return res.blob();
    },

    /**
     * Email küldése a jegyzőkönyvvel
     */
    async sendEmail(reportId, emailAddress) {
        const res = await fetch(`${getBaseUrl()}/reports/${reportId}/email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailAddress })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'E-mail küldési hiba.');
        return data;
    },

    /**
     * Dashboard statisztikák letöltése
     */
    async getAdminStats() {
        const res = await fetch(`${getBaseUrl()}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return res.json();
    }
};
