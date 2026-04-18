/** Kötelező mezők — mentés / export előtt (P0) */

export type ReportFieldKey =
  | "docType"
  | "customerName"
  | "siteAddress"
  | "inspectorName"
  | "inspectorLicense"
  | "instrumentType"
  | "instrumentCal"
  | "envTemp"
  | "envHumidity";

/** Egy mezőre — üres string ha rendben (UI hibaüzenethez). */
export function getFieldError(
  key: ReportFieldKey,
  value: string | undefined,
  phase: "save" | "export" = "save"
): string {
  const v = (value ?? "").trim();

  switch (key) {
    case "docType":
      return v ? "" : "Vizsgálat típusa kötelező.";
    case "customerName":
      return v ? "" : "Megrendelő neve kötelező.";
    case "siteAddress":
      return v ? "" : "Vizsgált objektum címe kötelező.";
    case "inspectorName":
      if (phase === "save") return "";
      return v ? "" : "Felülvizsgáló neve kötelező az exporthoz.";
    case "inspectorLicense":
      if (phase === "save") return "";
      return v ? "" : "Vizsgabizonyítvány száma kötelező az exporthoz.";
    case "instrumentType":
      if (phase === "save") return "";
      return v ? "" : "Mérőműszer (típus) kötelező az exporthoz.";
    case "instrumentCal":
      if (phase === "save") return "";
      return v ? "" : "Műszer kalibrálás érvényessége kötelező az exporthoz.";
    case "envTemp": {
      if (!v) return "";
      const n = Number(v);
      if (Number.isNaN(n) || n < -40 || n > 60) {
        return "Hőmérséklet: ésszerű tartomány -40 … 60 °C.";
      }
      return "";
    }
    case "envHumidity": {
      if (!v) return "";
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return "Páratartalom: 0–100% között add meg.";
      }
      return "";
    }
    default:
      return "";
  }
}

export function validateForSave(reportData: Record<string, string>): string[] {
  const errs: string[] = [];
  if (!reportData.customerName?.trim()) {
    errs.push('Megrendelő neve kötelező.');
  }
  if (!reportData.siteAddress?.trim()) {
    errs.push('Vizsgált objektum címe kötelező.');
  }
  if (!reportData.docType?.trim()) {
    errs.push('Vizsgálat típusa kötelező.');
  }
  return errs;
}

/** Word/PDF export — szakmai minimum */
export function validateForExport(reportData: Record<string, string>): string[] {
  const errs = validateForSave(reportData);
  if (!reportData.inspectorName?.trim()) {
    errs.push('Felülvizsgáló neve kötelező az exporthoz.');
  }
  if (!reportData.inspectorLicense?.trim()) {
    errs.push('Vizsgabizonyítvány száma kötelező az exporthoz.');
  }
  if (!reportData.instrumentType?.trim()) {
    errs.push('Mérőműszer (típus) kötelező az exporthoz.');
  }
  if (!reportData.instrumentCal?.trim()) {
    errs.push('Műszer kalibrálás érvényessége kötelező az exporthoz.');
  }
  return errs;
}

/** Véglegesítés előtt minden exportkövetelmény */
export function validateForFinalize(reportData: Record<string, string>): string[] {
  return validateForExport(reportData);
}
