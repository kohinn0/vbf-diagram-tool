/** Kötelező mezők — mentés / export előtt (P0) */

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
