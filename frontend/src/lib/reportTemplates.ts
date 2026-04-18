import type { VisualChecksState } from '../store/draftStore';

/** Sablon csak a jegyzőkönyv „adatlap” mezőit és §6.4.2 jelölőket tölti — ügyfél/helyszín nélkül. */
type ReportTemplatePatch = {
  reportData: Record<string, string>;
  visualChecks?: Partial<VisualChecksState>;
};

type BuiltinReportTemplate = {
  id: string;
  label: string;
  /** Rövid magyarázat a legördülőben */
  hint?: string;
  patch: ReportTemplatePatch;
};

const indoor = { envTemp: '22', envHumidity: '45' };

const allVisualOk: Partial<VisualChecksState> = {
  id_marks: true,
  protection: true,
  fire: true,
  conduction: true,
  connection: true,
  access: true,
};

/** Legalább 12 előre definiált sablon — gyorskitöltő a Jegyzőkönyv adatok fülön. */
export const BUILTIN_REPORT_TEMPLATES: BuiltinReportTemplate[] = [
  {
    id: 'vbf_lako_ak',
    label: 'VBF időszakos — lakóház (AK)',
    hint: 'OTSZ AK, tipikus lakó',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Lakóépület (családi ház / lakás)',
        buildingOtsz: 'AK',
        ...indoor,
        reportNotes:
          'Időszakos felülvizsgálat — lakóépület. A helyszíni szemrevételezés és mérések alapján összeállítva.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_tarsashaz_kk',
    label: 'VBF időszakos — társasház (KK)',
    hint: 'Közös képviselős, KK osztály',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Társasház — lakó és közös helyiségek',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes:
          'Időszakos felülvizsgálat — társasház. Az elosztó és fogyasztói körök ellenőrzése dokumentálva.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_iroda_kk',
    label: 'VBF időszakos — iroda (KK)',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Irodaépület / ügyintézés',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'Időszakos felülvizsgálat — irodai használatra kijelölt helyiségek.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_ipari_mk',
    label: 'VBF időszakos — ipari / műhely (MK)',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Ipari csarnok / műhely / termelés',
        buildingOtsz: 'MK',
        envTemp: '20',
        envHumidity: '55',
        reportNotes:
          'Időszakos felülvizsgálat — ipari környezet. A gépek és elosztók terhelési viszonyai figyelembe véve.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_kereskedelem',
    label: 'VBF időszakos — kereskedelmi üzlet',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Kereskedelmi üzlethelyiség',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'Időszakos felülvizsgálat — kereskedelmi rendeltetés, nyilvános forgalom.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_elso_uj',
    label: 'VBF első felülvizsgálat — új épület',
    patch: {
      reportData: {
        docType: 'VBF_ELSO',
        buildingPurpose: 'Új épület / felújítás utáni átadás',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes:
          'Első felülvizsgálat (üzembe helyezés előtti) — új létesítmény. Dokumentáció és helyszíni egyeztetés szerint.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_berbeadas_iroda',
    label: 'VBF bérbeadás előtti — iroda',
    patch: {
      reportData: {
        docType: 'VBF_BERBEADAS',
        buildingPurpose: 'Iroda — bérbeadás / haszonbérlet előtti állapot',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'Bérbeadás előtti felülvizsgálat (40/2017. NGM) — irodai egység.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_eladas_lakas',
    label: 'VBF eladás / tulajdonváltás — lakás',
    patch: {
      reportData: {
        docType: 'VBF_ELADAS',
        buildingPurpose: 'Lakóingatlan — tulajdonosi jogváltás',
        buildingOtsz: 'AK',
        ...indoor,
        reportNotes: 'Eladás előtti / tulajdonosi jogváltáshoz kapcsolódó felülvizsgálat — lakás.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'eph_csaladi',
    label: 'EPH — családi ház',
    patch: {
      reportData: {
        docType: 'EPH',
        buildingPurpose: 'Családi ház — egyenpotenciál / fővezető',
        buildingOtsz: 'AK',
        ...indoor,
        reportNotes:
          'EPH (egyenpotenciál) felülvizsgálat — családi ház. Fővezető, földelő, kötővezeték ellenőrzése.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'eph_tarsashaz',
    label: 'EPH — társasház',
    patch: {
      reportData: {
        docType: 'EPH',
        buildingPurpose: 'Társasház — közös EPH / fővezető',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'EPH felülvizsgálat — társasház. Főelosztó és lakáselágazások egyenpotenciálja.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'eph_iroda',
    label: 'EPH — irodaház',
    patch: {
      reportData: {
        docType: 'EPH',
        buildingPurpose: 'Irodaház — egyenpotenciál',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'EPH felülvizsgálat — irodai épület, szintenkénti elosztók.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'eph_ipari',
    label: 'EPH — ipari csarnok',
    patch: {
      reportData: {
        docType: 'EPH',
        buildingPurpose: 'Ipari csarnok — egyenpotenciál / fém szerkezet',
        buildingOtsz: 'MK',
        envTemp: '18',
        envHumidity: '60',
        reportNotes: 'EPH felülvizsgálat — ipari létesítmény, nagyfelületű földelő rendszerek.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_oktatas',
    label: 'VBF időszakos — oktatási intézmény',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Oktatási intézmény (iskola, óvoda)',
        buildingOtsz: 'KK',
        ...indoor,
        reportNotes: 'Időszakos felülvizsgálat — oktatási rendeltetés, közösségi terek.',
      },
      visualChecks: allVisualOk,
    },
  },
  {
    id: 'vbf_garazs',
    label: 'VBF időszakos — garázs / parkoló',
    patch: {
      reportData: {
        docType: 'VBF_IDOSZAKOS',
        buildingPurpose: 'Garázs / parkolóház — melléképület',
        buildingOtsz: 'AK',
        envTemp: '15',
        envHumidity: '65',
        reportNotes: 'Időszakos felülvizsgálat — garázs, világítás és elosztó környezeti terhelés szerint.',
      },
      visualChecks: allVisualOk,
    },
  },
];

const USER_TEMPLATES_KEY = 'vbf_user_report_templates_v1';

type UserReportTemplate = {
  id: string;
  name: string;
  createdAt: string;
  patch: ReportTemplatePatch;
};

function safeParse(json: string | null): UserReportTemplate[] {
  if (!json) return [];
  try {
    const x = JSON.parse(json) as unknown;
    if (!Array.isArray(x)) return [];
    return x.filter(
      (t): t is UserReportTemplate =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as UserReportTemplate).id === 'string' &&
        typeof (t as UserReportTemplate).name === 'string' &&
        typeof (t as UserReportTemplate).patch === 'object'
    );
  } catch {
    return [];
  }
}

export function loadUserReportTemplates(): UserReportTemplate[] {
  return safeParse(localStorage.getItem(USER_TEMPLATES_KEY));
}

export function saveCurrentAsUserTemplate(name: string, patch: ReportTemplatePatch): UserReportTemplate {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A sablon neve kötelező.');
  const list = loadUserReportTemplates();
  const entry: UserReportTemplate = {
    id: `user_${crypto.randomUUID()}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    patch,
  };
  list.push(entry);
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(list));
  return entry;
}
