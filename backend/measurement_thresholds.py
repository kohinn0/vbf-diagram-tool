"""
MSZ HD 60364-6:2017 — mérési határértékek tájékoztató szövege a jegyzőkönyvhöz (Word/PDF).
A pontos elfogadási feltétel a berendezés típusától és a hálózattól függ; ez összefoglaló jellegű.
"""

MEASUREMENT_THRESHOLDS_TITLE = "Határértékek (tájékoztató)"

MEASUREMENT_THRESHOLDS_BODY = (
    "A táblázatok értelmezéséhez az alábbi — tájékoztató jellegű — határértékek és összefüggések vehetők figyelembe "
    "(a pontos elfogadási feltétel a berendezés típusától, a védőeszköz típusától és a hálózati rendszertől függ):\n\n"
    "• Védővezető folytonosság (Rpe), §61.3.2: tipikusan Rpe ≤ 1,0 Ω szerződéses (normál) körülmények között; "
    "egyéb feltételek esetén az MSZ HD 60364-6 táblázatai és magyarázatai szerint.\n"
    "• Szigetelési ellenállás (Riso), 500 V DC, §61.3.3: a mért értékeknek legalább 1,0 MΩ-nak kell lenniük "
    "(L–N, L–PE, N–PE összehasonlítása a táblázat szerint).\n"
    "• Hurokellenállás / hurokimpedancia (Zs), §61.3.6: Zs ≤ U0 × 0,95 / Ia, ahol Ia a védőberendezés (pl. kismegszakító) "
    "névleges oldási árama a görbéje szerint (B/C/D); U0 a névleges váltakozó feszültség (jellemzően 230 V TN rendszerben).\n"
    "• FI-relé / áram-védőkapcsoló (ÁVK), §61.3.7: az 1×IΔn próbán a kioldási idő tipikusan legfeljebb 300 ms (általános védelem); "
    "személyvédelmi követelmények esetén szigorúbb értékek érvényesek (gyakran ≤ 40 ms), a gyártói adatlap és a készülék típusa szerint.\n"
    "• EPH / fővezető folytonosság: az elfogadási feltétel a MSZ HD 60364-5-54 §544 és a táblázat szerinti összehasonlítás szerint értelmezendő."
)
