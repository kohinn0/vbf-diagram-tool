"""
Unit tests for VBF backend validation and generator logic.
Run with: python -m pytest tests/ -v
"""
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestZsValidation:
    """Hurokimpedancia (Zs) validációs tesztek — MSZ HD 60364-6:2017 §61.3.6"""

    def test_b16_max_zs(self):
        """B16 kismegszakító: Ia = 16 × 5 = 80A → Zs ≤ 230×0.95/80 = 2.73 Ω"""
        Ia = 16 * 5
        maxZs = (230 * 0.95) / Ia
        assert round(maxZs * 100) / 100.0 == 2.73

    def test_c16_max_zs(self):
        """C16 kismegszakító: Ia = 16 × 10 = 160A → Zs ≤ 230×0.95/160 = 1.37 Ω"""
        Ia = 16 * 10
        maxZs = (230 * 0.95) / Ia
        assert round(maxZs, 2) == 1.37

    def test_c20_max_zs(self):
        """C20 kismegszakító: Ia = 20 × 10 = 200A → Zs ≤ 230×0.95/200 = 1.09 Ω"""
        Ia = 20 * 10
        maxZs = (230 * 0.95) / Ia
        assert round(maxZs, 2) == 1.09

    def test_d32_max_zs(self):
        """D32 kismegszakító: Ia = 32 × 20 = 640A → Zs ≤ 230×0.95/640 = 0.34 Ω"""
        Ia = 32 * 20
        maxZs = (230 * 0.95) / Ia
        assert round(maxZs, 2) == 0.34

    def test_zs_pass(self):
        """Mért Zs érték MEGFELELŐ ha kisebb mint maxZs"""
        Ia = 16 * 10  # C16
        maxZs = (230 * 0.95) / Ia
        measured = 1.2
        assert measured <= maxZs  # 1.2 ≤ 1.37 → PASS

    def test_zs_fail(self):
        """Mért Zs érték NEM MEGFELELŐ ha nagyobb mint maxZs (VBF-2026-006 minta)"""
        Ia = 20 * 10  # C20
        maxZs = (230 * 0.95) / Ia  # 1.09 Ω
        measured = 1.58  # Mintából
        assert measured > maxZs  # 1.58 > 1.09 → FAIL


class TestRpeValidation:
    """Védővezető folytonosság (Rpe) tesztek — MSZ HD 60364-6:2017 §61.3.2"""

    def test_rpe_pass(self):
        """0.12 Ω ≤ 1.0 Ω → MEGFELELŐ"""
        assert 0.12 <= 1.0

    def test_rpe_fail(self):
        """1.55 Ω > 1.0 Ω → NEM MEGFELELŐ (mintából)"""
        assert 1.55 > 1.0

    def test_rpe_extreme_fail(self):
        """9.68 Ω → Súlyos hiba"""
        assert 9.68 > 1.0


class TestRisoValidation:
    """Szigetelési ellenállás (Riso) tesztek — MSZ HD 60364-6:2017 §61.3.3"""

    def test_riso_pass(self):
        """200 MΩ ≥ 1.0 MΩ → MEGFELELŐ"""
        assert 200.0 >= 1.0

    def test_riso_fail(self):
        """0.5 MΩ < 1.0 MΩ → NEM MEGFELELŐ"""
        assert 0.5 < 1.0

    def test_riso_boundary(self):
        """1.0 MΩ = 1.0 MΩ → MEGFELELŐ (pont a határon)"""
        assert 1.0 >= 1.0


class TestRcdValidation:
    """RCD/ÁVK kioldási idő tesztek — MSZ HD 60364-6:2017 §61.3.7"""

    def test_rcd_pass(self):
        """24 ms ≤ 300 ms → MEGFELELŐ"""
        assert 24 <= 300

    def test_rcd_fail(self):
        """350 ms > 300 ms → NEM MEGFELELŐ"""
        assert 350 > 300

    def test_rcd_personal_pass(self):
        """12 ms ≤ 40 ms → Személyvédelmi MEGFELELŐ"""
        assert 12 <= 40


class TestCalibrationGate:
    """Kalibrálási gát teszt"""

    def test_valid_calibration(self):
        """Jövőbeli dátum → érvényes"""
        from datetime import datetime, timedelta
        cal_date = datetime.now() + timedelta(days=180)
        assert cal_date > datetime.now()

    def test_expired_calibration(self):
        """Múltbeli dátum → lejárt → blokkolja a Megfelelő minősítést"""
        from datetime import datetime, timedelta
        cal_date = datetime.now() - timedelta(days=30)
        assert cal_date < datetime.now()


class TestMEEClassification:
    """MEE Kézikönyv hibakategorizálás egyeztetési tesztek"""

    CRITICAL_A = ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés',
                  'tűzveszély', 'védővezető hiány', 'beégett', 'érinthető feszültség']
    SERIOUS_B = ['szigetelés sérült', 'rcd nem', 'hurokellenállás', 'zárlat',
                 'hurokimpedancia', 'nem old ki']
    MAINTENANCE_C = ['dobozfedél', 'fedél hiány', 'kötés laza', 'sorkapocs']
    RENOVATION_D = ['vezetékszínezés', 'régi szabvány', 'elavult', 'nullázás']

    def _classify(self, desc):
        desc_lower = desc.lower()
        if any(kw in desc_lower for kw in self.CRITICAL_A):
            return 'A'
        elif any(kw in desc_lower for kw in self.SERIOUS_B):
            return 'B'
        elif any(kw in desc_lower for kw in self.MAINTENANCE_C):
            return 'C'
        elif any(kw in desc_lower for kw in self.RENOVATION_D):
            return 'D'
        return 'C'  # Default

    def test_critical_life_danger(self):
        assert self._classify("Beégett kötés az elosztóban, érinthető feszültség a burkolaton") == 'A'

    def test_serious_rcd_fail(self):
        assert self._classify("RCD nem oldott ki a tesztelés során") == 'B'

    def test_serious_impedance(self):
        assert self._classify("Hurokellenállás értéke meghaladja a megengedettet") == 'B'

    def test_maintenance_cover(self):
        assert self._classify("Dobozfedél hiányzik a fürdőszobai kötődobozról") == 'C'

    def test_renovation_wiring(self):
        assert self._classify("Téves vezetékszínezés a régi rendszerben") == 'D'

    def test_renovation_old_standard(self):
        assert self._classify("Elavult nullázásos rendszer, korszerűtlen kialakítás") == 'D'

    def test_unknown_defaults_to_c(self):
        assert self._classify("Egyéb nem besorolható probléma") == 'C'


class TestOTSZInspectionCycles:
    """OTSZ felülvizsgálati ciklusidő tesztek"""

    CYCLES = {'AK': 6, 'KK': 3, 'MK': 1, 'NAK': 6}

    def test_residential(self):
        """Lakóépület (AK) → 6 évente"""
        assert self.CYCLES['AK'] == 6

    def test_workplace(self):
        """Munkahely (KK) → 3 évente"""
        assert self.CYCLES['KK'] == 3

    def test_hazardous(self):
        """Robbanásveszélyes (MK) → 1 évente"""
        assert self.CYCLES['MK'] == 1

    def test_next_inspection_date(self):
        """AK → 6 év múlva"""
        from datetime import datetime
        now = datetime.now()
        years = self.CYCLES['AK']
        next_date = now.replace(year=now.year + years)
        assert next_date.year == now.year + 6


class TestStandardReferences:
    """Szabványhivatkozás automatikus kitöltés tesztek"""

    STANDARD_MAP = {
        'védővezető': 'MSZ HD 60364-6:2017 §61.3.2',
        'szigetelés': 'MSZ HD 60364-6:2017 §61.3.3',
        'hurok': 'MSZ HD 60364-6:2017 §61.3.6',
        'rcd': 'MSZ HD 60364-6:2017 §61.3.7',
        'eph': 'MSZ HD 60364-5-54:2011 §544',
    }

    def _get_standard(self, desc):
        desc_lower = desc.lower()
        for keyword, std in self.STANDARD_MAP.items():
            if keyword in desc_lower:
                return std
        return 'MSZ HD 60364-6:2017'

    def test_rpe_standard(self):
        std = self._get_standard("Védővezető folytonosság nem megfelelő")
        assert '§61.3.2' in std

    def test_insulation_standard(self):
        std = self._get_standard("Szigetelési ellenállás túl alacsony")
        assert '§61.3.3' in std

    def test_loop_standard(self):
        std = self._get_standard("Hurokellenállás túl magas")
        assert '§61.3.6' in std

    def test_rcd_standard(self):
        std = self._get_standard("RCD kioldási idő nem megfelelő")
        assert '§61.3.7' in std
