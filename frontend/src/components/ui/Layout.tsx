import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useDraftStore } from "../../store/draftStore";
import { saveReportToCloud } from "../../lib/api";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = useDraftStore.getState().buildApiPayload();
      const currentReportId = localStorage.getItem('vbf_last_report_id') || undefined;
      const data = await saveReportToCloud(payload, currentReportId);
      if (data && data.id) {
        localStorage.setItem('vbf_last_report_id', String(data.id));
        alert('✅ Sikeres mentés felhőbe!');
      }
    } catch (e: any) {
      alert('❌ Hiba történt mentés során: ' + (e.message || 'Ismeretlen hiba'));
    } finally {
      setIsSaving(false);
    }
  };

  const isDiagramTab = location.pathname.includes("/diagram");
  const isReportTab = location.pathname.includes("/report");
  const isDefectsTab = location.pathname.includes("/defects");
  const isMeasurementsTab = location.pathname.includes("/measurements");

  const handleExport = async (type: 'pdf' | 'word') => {
    const reportId = localStorage.getItem('vbf_last_report_id');
    if (!reportId) return alert('Kérlek előbb mentsd el a jegyzőkönyvet a felhőbe!');
    
    setIsSaving(true);
    try {
      const { exportPdf, exportWord } = await import("../../lib/api");
      const blob = type === 'pdf' ? await exportPdf(reportId) : await exportWord(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VBF_Jegyzkokonyv_${reportId}.${type === 'pdf' ? 'pdf' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('❌ Exportálási hiba: ' + (e.message || 'Hiba'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      {/* Top Navigation */}
      <header className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] shrink-0 z-50">
        <nav className="flex items-center gap-6 w-full h-full">
          <div className="flex items-center h-full gap-4">
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
              <span className="w-7 h-7 bg-primary rounded shadow-sm flex items-center justify-center text-white text-xs">VBF</span>
              <span>VBF Premium</span>
            </Link>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center h-full ml-6 space-x-1">
              <Link
                to="/app/diagram"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isDiagramTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Rajz & Alaprajz
              </Link>
              <Link
                to="/app/report"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isReportTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/defects"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isDefectsTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Hibajegyzék & Képek
              </Link>
              <Link
                to="/app/measurements"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isMeasurementsTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Mérési adatok
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleExport('word')} 
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded shadow hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              📄 Word
            </button>
            <button 
              onClick={() => handleExport('pdf')} 
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded shadow hover:bg-red-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center min-w-[70px] mr-2 border border-red-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
              PDF
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] mr-2"></div>

            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded shadow hover:bg-primary-hover transition-colors disabled:opacity-50 min-w-[90px]"
            >
              {isSaving ? 'Aktivitás...' : 'Mentés ☁️'}
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold cursor-pointer ml-3">
              U
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
