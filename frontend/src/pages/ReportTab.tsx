import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { useDraftStore } from "../store/draftStore";

export default function ReportTab() {
  const { reportData, updateReportData } = useDraftStore();

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-main)]">Jegyzőkönyv típusa és alapadatok</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">Rajz → Adatok → Hibák → Mérések → Mentés</p>

      <div className="mb-8 p-6 rounded-2xl border-l-[3px] border-primary bg-[var(--color-bg-card)] shadow-sm">
        <label className="mb-3 block text-[0.95rem] font-bold leading-snug text-primary">Gyorskitöltő sablon betöltése</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          <Select className="flex-1">
            <option value="">-- Válassz sablont (opcionális) --</option>
          </Select>
          <Button>Mentés saját sablonként</Button>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-semibold text-[var(--color-text-muted-strong)] mb-2 block">Vizsgálat Típusa (MSZ HD 60364 / OTSZ)</label>
        <Select 
          value={reportData['docType'] || ''} 
          onChange={(e) => updateReportData('docType', e.target.value)}
        >
          <option value="VBF_IDOSZAKOS">VBF - Időszakos felülvizsgálat (OTSZ szerint)</option>
          <option value="VBF_ELSO">VBF - Első felülvizsgálat (Üzembe helyezés előtti)</option>
          <option value="VBF_BERBEADAS">VBF - Bérbeadás előtti felülvizsgálat (40/2017. NGM)</option>
          <option value="VBF_ELADAS">VBF - Tulajdonosi jogváltás / Eladás előtti felülvizsgálat</option>
          <option value="EPH">EPH - Egyenpotenciálra Hozó Hálózat Felülvizsgálat Mérés</option>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Helyszín és megrendelő</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Mentett ügyfél betöltése</label>
              <Select><option>-- Válassz Ügyfelet --</option></Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Megrendelő Neve / Cégneve</label>
              <Input 
                value={reportData['customerName'] || ''} 
                onChange={(e) => updateReportData('customerName', e.target.value)} 
                placeholder="Pl. Kovács Kft. vagy Gipsz Jakab" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Vizsgált Objektum Címe</label>
              <Input 
                value={reportData['siteAddress'] || ''} 
                onChange={(e) => updateReportData('siteAddress', e.target.value)} 
                placeholder="Pl. 1011 Bp., Fő utca 1." 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Helyrajzi Szám (HRSZ) / Épület azonosító (OTSZ)</label>
              <Input 
                value={reportData['siteHrsz'] || ''} 
                onChange={(e) => updateReportData('siteHrsz', e.target.value)} 
                placeholder="Pl. 12345/6 / A Épület" 
              />
            </div>

            <hr className="my-2 border-[var(--border-color)]" />
            <h3 className="font-semibold text-[var(--color-text-main)]">Környezeti Tényezők és Szabványok</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Hőmérséklet a vizsgálat idején (°C)</label>
              <Input 
                type="number" 
                value={reportData['envTemp'] || ''} 
                onChange={(e) => updateReportData('envTemp', e.target.value)} 
                placeholder="Pl. 22" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Relatív páratartalom (%)</label>
              <Input 
                type="number" 
                value={reportData['envHumidity'] || ''} 
                onChange={(e) => updateReportData('envHumidity', e.target.value)} 
                placeholder="Pl. 45" 
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Előadó és eszközök</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Mentett felülvizsgáló betöltése</label>
              <Select><option>-- Válassz Felülvizsgálót --</option></Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Felülvizsgáló Cég / Személy Neve</label>
              <Input 
                value={reportData['inspectorName'] || ''} 
                onChange={(e) => updateReportData('inspectorName', e.target.value)} 
                placeholder="Zöldfülű Vill Kft." 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Vizsgabizonyítvány Száma</label>
              <Input 
                value={reportData['inspectorLicense'] || ''} 
                onChange={(e) => updateReportData('inspectorLicense', e.target.value)} 
                placeholder="Pl. VBF-12345/2023" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Mérőműszer (Típus és Gyári Szám)</label>
              <Input 
                value={reportData['instrumentType'] || ''} 
                onChange={(e) => updateReportData('instrumentType', e.target.value)} 
                placeholder="Pl. Metrel MI 3152, SN:123456" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Műszer Kalibrálás Érvényessége</label>
              <Input 
                type="date" 
                value={reportData['instrumentCal'] || ''} 
                onChange={(e) => updateReportData('instrumentCal', e.target.value)} 
                placeholder="Érvényesség dátuma" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Műszer Mérési Bizonytalansága</label>
              <Input 
                value={reportData['instrumentError'] || ''} 
                onChange={(e) => updateReportData('instrumentError', e.target.value)} 
                placeholder="Pl. ± 5%" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Megjegyzések és Összefoglaló</CardTitle>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
              onClick={async () => {
                try {
                  const { generateAiSummary } = await import('../lib/api');
                  const { useDraftStore } = await import('../store/draftStore');
                  const payload = useDraftStore.getState().buildApiPayload();
                  const summary = await generateAiSummary(payload);
                  updateReportData('reportNotes', summary);
                } catch (e: any) {
                  alert(e.message || 'Hiba az AI generálás során');
                }
              }}
            >
              ✨ AI Szöveggenerálás
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Ideális a feltárt hibák, mérési eredmények szabadszavas összefoglalására (Word/PDF-be is bekerül)</label>
              <textarea 
                className="w-full min-h-[150px] p-3 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                value={reportData['reportNotes'] || ''}
                onChange={(e) => updateReportData('reportNotes', e.target.value)}
                placeholder="Pl. A vizsgálat során 3 darab kritikus hibát tártunk fel az 1. emeleti elosztónál..."
              />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Belső megjegyzések (Csak neked, nem kerül be a nyomtatásba!)</label>
              <textarea 
                className="w-full min-h-[80px] p-3 text-sm rounded-md border border-[var(--border-color)] bg-[rgba(255,200,0,0.05)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-y"
                value={reportData['inspectorNotes'] || ''}
                onChange={(e) => updateReportData('inspectorNotes', e.target.value)}
                placeholder="Pl. Gipsz Jakab 10.000 Ft-ot még lóg a kiszállásért."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
